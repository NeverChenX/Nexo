import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SHARE_LINKS_FILE = path.join(process.cwd(), 'share-links.json');

interface ShareLink {
  path: string;
  type: 'article' | 'folder';
  createdAt: string;
}

// 初始化分享链接文件
async function initShareLinksFile(): Promise<void> {
  try {
    await fs.stat(SHARE_LINKS_FILE);
  } catch {
    await fs.writeFile(SHARE_LINKS_FILE, JSON.stringify({}), 'utf-8');
  }
}

// 读取所有分享链接
async function getAllShareLinks(): Promise<Record<string, ShareLink>> {
  await initShareLinksFile();
  const content = await fs.readFile(SHARE_LINKS_FILE, 'utf-8');
  return JSON.parse(content || '{}');
}

// 保存分享链接
async function saveShareLinks(
  links: Record<string, ShareLink>
): Promise<void> {
  await fs.writeFile(SHARE_LINKS_FILE, JSON.stringify(links, null, 2), 'utf-8');
}

// 生成分享链接
export async function createShareLink(
  itemPath: string,
  type: 'article' | 'folder'
): Promise<string> {
  const token = uuidv4().replace(/-/g, '').substring(0, 12);
  const links = await getAllShareLinks();

  links[token] = {
    path: itemPath,
    type,
    createdAt: new Date().toISOString(),
  };

  await saveShareLinks(links);
  return token;
}

// 删除分享链接
export async function deleteShareLink(token: string): Promise<boolean> {
  const links = await getAllShareLinks();

  if (!links[token]) {
    return false;
  }

  delete links[token];
  await saveShareLinks(links);
  return true;
}

// 获取分享链接信息
export async function getShareLink(token: string): Promise<ShareLink | null> {
  const links = await getAllShareLinks();
  return links[token] || null;
}

// 检查分享链接是否存在
export async function shareTokenExists(token: string): Promise<boolean> {
  const link = await getShareLink(token);
  return !!link;
}

// 获取所有分享链接
export async function getAllShares(): Promise<
  Array<{ token: string } & ShareLink>
> {
  const links = await getAllShareLinks();
  return Object.entries(links).map(([token, link]) => ({
    token,
    ...link,
  }));
}
