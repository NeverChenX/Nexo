import fs from 'fs/promises';
import path from 'path';

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

// 获取文件树结构
export async function getFileTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<Array<{ name: string; path: string; isFolder: boolean }>> {
  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{ name: string; path: string; isFolder: boolean }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '_index.md') continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: relativeSafePath,
        isFolder: true,
      });
    } else if (entry.name.endsWith('.md')) {
      items.push({
        name: entry.name.replace('.md', ''),
        path: relativeSafePath.replace('.md', ''),
        isFolder: false,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Use Promise cache to handle concurrent requests and graceful failure
let _migrationPromise: Promise<void> | null = null;

// 获取递归的文件树（包含子目录）
export async function getRecursiveTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<
  Array<{ name: string; path: string; isFolder: boolean; children?: Array<any> }>
> {
  // Auto-migrate once on first root call; cache the Promise to handle concurrent requests
  if (dirPath === WIKI_DATA_DIR) {
    if (!_migrationPromise) {
      _migrationPromise = migrateToPageModel().catch((err) => {
        // Migration failed — reset so it can retry next time, but don't block tree loading
        _migrationPromise = null;
        console.error('Page model migration failed:', err);
      });
    }
    await _migrationPromise;
  }

  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{ name: string; path: string; isFolder: boolean; children?: Array<any> }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '_index.md') continue; // hidden: it's the page's own content

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await getRecursiveTree(fullPath, relativeSafePath);
      items.push({ name: entry.name, path: relativeSafePath, isFolder: true, children });
    } else if (entry.name.endsWith('.md')) {
      items.push({
        name: entry.name.replace('.md', ''),
        path: relativeSafePath.replace('.md', ''),
        isFolder: false,
      });
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

/**
 * 幂等迁移：确保每个目录都有 _index.md。
 * 现有没有内容的目录会获得 "# dirname" 作为默认内容。
 */
export async function migrateToPageModel(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === '_index.md') continue;
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dirPath, entry.name);
    const indexPath = path.join(fullPath, '_index.md');

    try {
      await fs.stat(indexPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // 为现有文件夹创建默认内容
      await fs.writeFile(indexPath, `# ${entry.name}\n`, 'utf-8');
    }

    // 递归进入子目录
    await migrateToPageModel(
      fullPath,
      relativePath ? `${relativePath}/${entry.name}` : entry.name
    );
  }
}

// 删除文章
export async function deleteArticle(articlePath: string): Promise<void> {
  const filePath = safePath(`${articlePath}.md`);
  await fs.unlink(filePath);
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
}

// 重命名文章
export async function renameArticle(oldPath: string, newPath: string): Promise<void> {
  const oldFile = safePath(`${oldPath}.md`);
  const newFile = safePath(`${newPath}.md`);
  await ensureDir(path.dirname(newFile));
  await fs.rename(oldFile, newFile);
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
  return newPath;
}

// 移动文章到新的父目录
export async function moveArticle(articlePath: string, newParentPath: string): Promise<string> {
  const articleName = path.basename(articlePath);
  const newPath = newParentPath ? `${newParentPath}/${articleName}` : articleName;
  
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
  return newPath;
}

// 获取文件夹内容
export async function getFolderContents(
  folderPath: string
): Promise<Array<{ name: string; path: string; isFolder: boolean }>> {
  const dirPath = folderPath
    ? safePath(folderPath)
    : WIKI_DATA_DIR;
  return getFileTree(dirPath, folderPath);
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
