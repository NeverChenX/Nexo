import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

// 确保目录存在
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.stat(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
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

// 获取递归的文件树（包含子目录）
export async function getRecursiveTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<
  Array<{
    name: string;
    path: string;
    isFolder: boolean;
    children?: Array<any>;
  }>
> {
  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{
    name: string;
    path: string;
    isFolder: boolean;
    children?: Array<any>;
  }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      const children = await getRecursiveTree(fullPath, relativeSafePath);
      items.push({
        name: entry.name,
        path: relativeSafePath,
        isFolder: true,
        children,
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

// 读取文章内容（支持叶子页面和父页面双模式）
export async function readArticle(articlePath: string): Promise<string> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    // 回退：父页面将内容存储在目录/_index.md 中
    const indexPath = path.join(WIKI_DATA_DIR, articlePath, '_index.md');
    return await fs.readFile(indexPath, 'utf-8');
  }
}

// 写入文章内容（支持叶子页面和父页面双模式）
export async function writeArticle(
  articlePath: string,
  content: string
): Promise<void> {
  const dirPath = path.join(WIKI_DATA_DIR, articlePath);
  try {
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      // 父页面：写入目录内的 _index.md
      await fs.writeFile(path.join(dirPath, '_index.md'), content, 'utf-8');
      return;
    }
  } catch { /* 目录不存在 — 继续叶子写入 */ }

  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

// 删除文章
export async function deleteArticle(articlePath: string): Promise<void> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  await fs.unlink(filePath);
}

// 创建文件夹
export async function createFolder(folderPath: string): Promise<void> {
  const dirPath = path.join(WIKI_DATA_DIR, folderPath);
  await ensureDir(dirPath);
}

// 删除文件夹
export async function deleteFolder(folderPath: string): Promise<void> {
  const dirPath = path.join(WIKI_DATA_DIR, folderPath);
  await fs.rm(dirPath, { recursive: true, force: true });
}

// 检查文件/文件夹是否存在（同时检查原始路径和 .md 后缀）
export async function exists(itemPath: string): Promise<boolean> {
  try {
    const filePath = path.join(WIKI_DATA_DIR, itemPath);
    await fs.stat(filePath);
    return true;
  } catch {
    // 文章在文件系统上存为 .md，也检查一下
    try {
      const mdPath = path.join(WIKI_DATA_DIR, `${itemPath}.md`);
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
    const dirPath = path.join(WIKI_DATA_DIR, itemPath);
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// 检查是否是文章（支持叶子页面和父页面双模式）
export async function isArticle(itemPath: string): Promise<boolean> {
  try {
    await fs.stat(path.join(WIKI_DATA_DIR, `${itemPath}.md`));
    return true;
  } catch {
    try {
      await fs.stat(path.join(WIKI_DATA_DIR, itemPath, '_index.md'));
      return true;
    } catch {
      return false;
    }
  }
}

// 重命名文件夹
export async function renameFolder(oldPath: string, newPath: string): Promise<void> {
  const oldDir = path.join(WIKI_DATA_DIR, oldPath);
  const newDir = path.join(WIKI_DATA_DIR, newPath);
  await ensureDir(path.dirname(newDir));
  await fs.rename(oldDir, newDir);
}

// 重命名文章
export async function renameArticle(oldPath: string, newPath: string): Promise<void> {
  const oldFile = path.join(WIKI_DATA_DIR, `${oldPath}.md`);
  const newFile = path.join(WIKI_DATA_DIR, `${newPath}.md`);
  await ensureDir(path.dirname(newFile));
  await fs.rename(oldFile, newFile);
}

// 移动文件夹到新的父目录
export async function moveFolder(folderPath: string, newParentPath: string): Promise<string> {
  const folderName = path.basename(folderPath);
  const newPath = newParentPath ? `${newParentPath}/${folderName}` : folderName;
  
  const oldDir = path.join(WIKI_DATA_DIR, folderPath);
  const newDir = path.join(WIKI_DATA_DIR, newPath);
  
  // 检查目标是否已存在
  try {
    await fs.stat(newDir);
    throw new Error('目标位置已存在同名文件夹');
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
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
  
  const oldFile = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  const newFile = path.join(WIKI_DATA_DIR, `${newPath}.md`);
  
  // 检查目标是否已存在
  try {
    await fs.stat(newFile);
    throw new Error('目标位置已存在同名文章');
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
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
    ? path.join(WIKI_DATA_DIR, folderPath)
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
    ? path.join(WIKI_DATA_DIR, folderPath)
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

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = folderPath
      ? `${folderPath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      const stat = await fs.stat(fullPath);
      const children = await fs.readdir(fullPath);
      const childCount = children.filter((c) => !c.startsWith('.')).length;
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
