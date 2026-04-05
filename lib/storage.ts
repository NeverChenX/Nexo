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

// 读取文章内容
export async function readArticle(articlePath: string): Promise<string> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

// 写入文章内容
export async function writeArticle(
  articlePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  const dirPath = path.dirname(filePath);
  await ensureDir(dirPath);
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

// 检查是否是文章
export async function isArticle(itemPath: string): Promise<boolean> {
  try {
    const filePath = path.join(WIKI_DATA_DIR, `${itemPath}.md`);
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
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

// 获取文件夹内容
export async function getFolderContents(
  folderPath: string
): Promise<Array<{ name: string; path: string; isFolder: boolean }>> {
  const dirPath = folderPath
    ? path.join(WIKI_DATA_DIR, folderPath)
    : WIKI_DATA_DIR;
  return getFileTree(dirPath, folderPath);
}
