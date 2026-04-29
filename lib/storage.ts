import fs from 'fs/promises';
import path from 'path';
import { invalidateWikiCache } from '@/lib/wiki-cache';
import { getOrCreateId } from '@/lib/article-id';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

/**
 * 路径安全守卫：确保解析后的路径不会逃逸出 WIKI_DATA_DIR。
 * 拒绝包含 .. 或绝对路径的输入。
 */
function safePath(...segments: string[]): string {
  const resolved = path.resolve(WIKI_DATA_DIR, ...segments);
  if (!resolved.startsWith(WIKI_DATA_DIR + path.sep) && resolved !== WIKI_DATA_DIR) {
    throw new Error('路径不合法：禁止访问数据目录之外的位置');
  }
  return resolved;
}

// 确保目录存在
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * 文件树节点。
 * 叶子页面 = 单文件 `path.md` → isFolder=false
 * 父页面   = 目录 `path/` + 可选 `path/_index.md` → isFolder=true
 */
export interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  mtime: number;
  children?: TreeItem[];
}

// 获取递归的文件树（包含子目录）。
// - 目录 mtime = max(目录自身 stat, 目录内 _index.md stat, 所有递归子项 mtime)
// - 规则：同一层级不会出现 `name.md` + `name/` 并存（写入层保证）
export async function getRecursiveTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<TreeItem[]> {
  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: TreeItem[] = [];

  // 同层冲突防护：若同层存在同名目录与 name.md，则目录优先，跳过叶子 .md
  // 以避免 tree 里出现 path 相同的两个节点（选择/渲染都会冲突）。
  const dirNames = new Set<string>();
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith('.')) dirNames.add(e.name);
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '_index.md') continue; // 父页面自身内容，不单独作为节点

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await getRecursiveTree(fullPath, relativeSafePath);
      let mtime = 0;
      try {
        mtime = (await fs.stat(fullPath)).mtimeMs;
      } catch { /* ignore */ }
      try {
        const indexMtime = (await fs.stat(path.join(fullPath, '_index.md'))).mtimeMs;
        if (indexMtime > mtime) mtime = indexMtime;
      } catch { /* _index.md 可能不存在，如根目录 */ }
      for (const c of children) if (c.mtime > mtime) mtime = c.mtime;
      items.push({ name: entry.name, path: relativeSafePath, isFolder: true, mtime, children });
    } else if (entry.name.endsWith('.md')) {
      const docName = entry.name.replace('.md', '');
      if (dirNames.has(docName)) {
        console.warn(
          `[wiki] tree 冲突：同层存在 "${docName}.md" 与 "${docName}/"，已忽略叶子 .md；请手动合并或删除。位置: ${relativePath || '/'}`
        );
        continue;
      }
      const docPath = relativeSafePath.replace('.md', '');
      let mtime = 0;
      try { mtime = (await fs.stat(fullPath)).mtimeMs; } catch { /* ignore */ }
      items.push({ name: docName, path: docPath, isFolder: false, mtime });
    }
  }

  return items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// 读取文章内容（支持叶子页面和父页面双模式）
export async function readArticle(articlePath: string): Promise<string> {
  const filePath = safePath(`${articlePath}.md`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // 回退：父页面将内容存储在目录/_index.md 中
    const indexPath = safePath(articlePath, '_index.md');
    return await fs.readFile(indexPath, 'utf-8');
  }
}

// 写入文章内容（支持叶子页面和父页面双模式）
export async function writeArticle(
  articlePath: string,
  content: string
): Promise<void> {
  const dirPath = safePath(articlePath);
  try {
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      // 父页面：写入目录内的 _index.md
      await fs.writeFile(path.join(dirPath, '_index.md'), content, 'utf-8');
      return;
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    /* 目录不存在 — 继续叶子写入 */
  }

  const filePath = safePath(`${articlePath}.md`);
  const parentDir = path.dirname(filePath);
  await ensureDir(parentDir);
  await fs.writeFile(filePath, content, 'utf-8');

  // If file was created inside a subdirectory of WIKI_DATA_DIR, ensure that
  // directory has an _index.md (makes it a valid parent page)
  if (parentDir !== WIKI_DATA_DIR) {
    const parentIndexPath = path.join(parentDir, '_index.md');
    try {
      await fs.stat(parentIndexPath);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      const dirname = path.basename(parentDir);
      await fs.writeFile(parentIndexPath, `# ${dirname}\n`, 'utf-8');
    }
  }

  invalidateWikiCache();
}

/**
 * 将叶子页面（page.md）转换为父页面（page/_index.md）。
 * 当第一个子页面被添加到叶子页面时自动调用。
 */
export async function promoteToParent(articlePath: string): Promise<void> {
  const filePath = safePath(`${articlePath}.md`);
  const dirPath = safePath(articlePath);
  const indexPath = path.join(dirPath, '_index.md');

  const content = await fs.readFile(filePath, 'utf-8');
  await ensureDir(dirPath);
  await fs.writeFile(indexPath, content, 'utf-8');
  await fs.unlink(filePath);
}

/**
 * Ensure parentPath is a valid parent page (directory + _index.md).
 * - If parentPath.md exists: promote it (move content to _index.md)
 * - If parentPath/ exists without _index.md: create default _index.md
 * - Otherwise: do nothing (parent will be created when child is written)
 */
export async function promoteParentIfNeeded(parentPath: string): Promise<void> {
  const filePath = safePath(`${parentPath}.md`);
  try {
    await fs.stat(filePath);
    // Leaf page exists — promote it to parent page
    await promoteToParent(parentPath);
    return;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  // Check if directory exists without _index.md
  const dirPath = safePath(parentPath);
  try {
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      const indexPath = path.join(dirPath, '_index.md');
      try {
        await fs.stat(indexPath);
        // _index.md already exists — nothing to do
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        // Create default _index.md
        const dirname = path.basename(parentPath);
        await fs.writeFile(indexPath, `# ${dirname}\n`, 'utf-8');
      }
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // Directory doesn't exist yet — will be created by writeArticle's ensureDir
  }
}

/**
 * Returns true if path is a valid parent page directory (directory + _index.md exists).
 * Use this instead of isFolder() when you need to verify it's a legitimate page.
 */
export async function isFolderPage(itemPath: string): Promise<boolean> {
  try {
    const dirStat = await fs.stat(safePath(itemPath));
    if (!dirStat.isDirectory()) return false;
    await fs.stat(safePath(itemPath, '_index.md'));
    return true;
  } catch {
    return false;
  }
}

// 删除文章
export async function deleteArticle(articlePath: string): Promise<void> {
  const filePath = safePath(`${articlePath}.md`);
  await fs.unlink(filePath);
  invalidateWikiCache();
}

// 创建文件夹
export async function createFolder(folderPath: string): Promise<void> {
  const dirPath = safePath(folderPath);
  await ensureDir(dirPath);
}

// 删除文件夹
export async function deleteFolder(folderPath: string): Promise<void> {
  const dirPath = safePath(folderPath);
  await fs.rm(dirPath, { recursive: true, force: true });
  invalidateWikiCache();
}

// 检查文件/文件夹是否存在（同时检查原始路径和 .md 后缀）
export async function exists(itemPath: string): Promise<boolean> {
  try {
    const filePath = safePath(itemPath);
    await fs.stat(filePath);
    return true;
  } catch {
    // 文章在文件系统上存为 .md，也检查一下
    try {
      const mdPath = safePath(`${itemPath}.md`);
      await fs.stat(mdPath);
      return true;
    } catch {
      return false;
    }
  }
}

// 检查是否是文件夹
export async function isFolder(itemPath: string): Promise<boolean> {
  try {
    const dirPath = safePath(itemPath);
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// 检查是否是文章（支持叶子页面和父页面双模式）
export async function isArticle(itemPath: string): Promise<boolean> {
  try {
    await fs.stat(safePath(`${itemPath}.md`));
    return true;
  } catch {
    try {
      await fs.stat(safePath(itemPath, '_index.md'));
      return true;
    } catch {
      return false;
    }
  }
}

// 重命名文件夹
export async function renameFolder(oldPath: string, newPath: string): Promise<void> {
  const oldDir = safePath(oldPath);
  const newDir = safePath(newPath);
  await ensureDir(path.dirname(newDir));
  await fs.rename(oldDir, newDir);
  invalidateWikiCache();
}

// 重命名文章（支持叶子页面和父页面）
export async function renameArticle(oldPath: string, newPath: string): Promise<void> {
  // 先检查是否是父页面（目录形式）
  const oldDir = safePath(oldPath);
  try {
    const stat = await fs.stat(oldDir);
    if (stat.isDirectory()) {
      // 父页面：重命名整个目录
      const newDir = safePath(newPath);
      await ensureDir(path.dirname(newDir));
      await fs.rename(oldDir, newDir);
      return;
    }
  } catch { /* 不是目录，继续按叶子页面处理 */ }

  const oldFile = safePath(`${oldPath}.md`);
  const newFile = safePath(`${newPath}.md`);
  await ensureDir(path.dirname(newFile));
  await fs.rename(oldFile, newFile);
  invalidateWikiCache();
}

// 移动文件夹到新的父目录
export async function moveFolder(folderPath: string, newParentPath: string): Promise<string> {
  const folderName = path.basename(folderPath);
  const newPath = newParentPath ? `${newParentPath}/${folderName}` : folderName;
  
  const oldDir = safePath(folderPath);
  const newDir = safePath(newPath);
  
  // 检查目标是否已存在
  try {
    await fs.stat(newDir);
    throw new Error('目标位置已存在同名文件夹');
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  
  // 检查是否移动到自身子目录
  if (newParentPath.startsWith(folderPath + '/')) {
    throw new Error('不能将文件夹移动到自身子目录');
  }
  
  await ensureDir(path.dirname(newDir));
  await fs.rename(oldDir, newDir);
  invalidateWikiCache();
  return newPath;
}

// 移动文章到新的父目录（支持叶子页面和父页面）
export async function moveArticle(articlePath: string, newParentPath: string): Promise<string> {
  const articleName = path.basename(articlePath);
  const newPath = newParentPath ? `${newParentPath}/${articleName}` : articleName;

  // 检查是否是父页面（目录形式）
  const oldDir = safePath(articlePath);
  try {
    const stat = await fs.stat(oldDir);
    if (stat.isDirectory()) {
      // 父页面：按文件夹模式移动
      return moveFolder(articlePath, newParentPath);
    }
  } catch { /* 不是目录，按叶子页面处理 */ }

  const oldFile = safePath(`${articlePath}.md`);
  const newFile = safePath(`${newPath}.md`);

  // 检查目标是否已存在
  try {
    await fs.stat(newFile);
    throw new Error('目标位置已存在同名文章');
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }

  await ensureDir(path.dirname(newFile));
  await fs.rename(oldFile, newFile);
  invalidateWikiCache();
  return newPath;
}

// 获取文件夹内容（含标题和修改时间）
export async function getFolderContentsDetailed(
  folderPath: string
): Promise<
  Array<{
    name: string;
    path: string;
    isFolder: boolean;
    title?: string;
    updatedAt?: string;
    childCount?: number;
  }>
> {
  const dirPath = folderPath
    ? safePath(folderPath)
    : WIKI_DATA_DIR;
  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{
    name: string;
    path: string;
    isFolder: boolean;
    title?: string;
    updatedAt?: string;
    childCount?: number;
  }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '_index.md') continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = folderPath
      ? `${folderPath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      const stat = await fs.stat(fullPath);
      const children = await fs.readdir(fullPath);
      const childCount = children.filter((c) => !c.startsWith('.') && c !== '_index.md').length;
      items.push({
        name: entry.name,
        path: relativeSafePath,
        isFolder: true,
        updatedAt: stat.mtime.toISOString(),
        childCount,
      });
    } else if (entry.name.endsWith('.md')) {
      const stat = await fs.stat(fullPath);
      const raw = await fs.readFile(fullPath, 'utf-8');
      const firstLine = raw.split('\n').find((l) => l.trim().length > 0) || '';
      const title = firstLine.replace(/^#+\s*/, '').trim() || entry.name.replace('.md', '');
      items.push({
        name: entry.name.replace('.md', ''),
        path: relativeSafePath.replace('.md', ''),
        isFolder: false,
        title,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }

  return items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    // 按修改时间倒序
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
}

/**
 * 扁平化所有文章列表（仅文件页面，不含纯文件夹），供 reader chapter-nav 使用。
 * 复用 getRecursiveTree 拿到完整树，再递归展开为 ArticleNode[]。
 *
 * 字段说明：
 * - id        持久化随机 8 位 ID（getOrCreateId 自动分配）
 * - idChain   从根到当前文章每一层 ID 用 '/' 拼接
 * - title     文件 basename（无扩展名），等价于 TreeItem.name
 * - path      完整相对路径（无 .md 扩展），等价于 TreeItem.path
 * - parentPath 父目录相对路径，根目录为 ''
 * - order     当前文章在 (同 parentPath 内的排序顺序) 中的索引（按 TreeItem 默认排序）
 */
export async function listAllArticles(): Promise<ArticleNode[]> {
  const tree = await getRecursiveTree();
  const out: ArticleNode[] = [];

  function walk(nodes: TreeItem[], parentPath: string, parentChain: string): void {
    // 仅在同一 parentPath 内对叶子文章做 order 编号
    let leafOrder = 0;
    for (const n of nodes) {
      if (n.isFolder) {
        // 文件夹本身不进入 ArticleNode 列表
        const childParentPath = n.path; // TreeItem.path 已含完整相对路径
        const folderId = getOrCreateId(n.path);
        const childParentChain = parentChain ? `${parentChain}/${folderId}` : folderId;
        if (n.children && n.children.length > 0) {
          walk(n.children, childParentPath, childParentChain);
        }
      } else {
        const id = getOrCreateId(n.path);
        const idChain = parentChain ? `${parentChain}/${id}` : id;
        out.push({
          id,
          idChain,
          title: n.name,
          path: n.path,
          parentPath,
          order: leafOrder,
        });
        leafOrder += 1;
      }
    }
  }

  walk(tree, '', '');
  return out;
}
