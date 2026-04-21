import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const SHARE_LINKS_FILE = path.join(process.cwd(), 'share-links.json');

let _lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = _lock;
  let release: () => void;
  _lock = new Promise<void>((r) => { release = r; });
  return prev.then(fn).finally(() => release!());
}

export interface ShareLink {
  path: string;
  type: 'article' | 'folder';
  createdAt: string;
  /** PIN 码 sha256 hex（6-20 位明文 PIN 的哈希）。为空表示无密码 */
  pinHash?: string;
  /** ISO 时间戳；缺失视为永久 */
  expiresAt?: string;
}

export interface CreateShareOptions {
  pin?: string;              // 明文 PIN
  expiresInDays?: number;    // 7 / 30 / null=永久
}

async function initShareLinksFile(): Promise<void> {
  try {
    await fs.stat(SHARE_LINKS_FILE);
  } catch {
    await fs.writeFile(SHARE_LINKS_FILE, JSON.stringify({}), 'utf-8');
  }
}

async function getAllShareLinks(): Promise<Record<string, ShareLink>> {
  await initShareLinksFile();
  const content = await fs.readFile(SHARE_LINKS_FILE, 'utf-8');
  return JSON.parse(content || '{}');
}

async function saveShareLinks(links: Record<string, ShareLink>): Promise<void> {
  await fs.writeFile(SHARE_LINKS_FILE, JSON.stringify(links, null, 2), 'utf-8');
}

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`nexo:${pin}`).digest('hex');
}

export async function createShareLink(
  itemPath: string,
  type: 'article' | 'folder',
  opts: CreateShareOptions = {},
): Promise<string> {
  return withLock(async () => {
    const links = await getAllShareLinks();
    let token: string;
    do {
      token = crypto.randomBytes(16).toString('hex');
    } while (links[token]);

    const entry: ShareLink = {
      path: itemPath,
      type,
      createdAt: new Date().toISOString(),
    };
    if (opts.pin && opts.pin.trim()) entry.pinHash = hashPin(opts.pin.trim());
    if (opts.expiresInDays && opts.expiresInDays > 0) {
      entry.expiresAt = new Date(Date.now() + opts.expiresInDays * 86400000).toISOString();
    }

    links[token] = entry;
    await saveShareLinks(links);
    return token;
  });
}

export async function deleteShareLink(token: string): Promise<boolean> {
  return withLock(async () => {
    const links = await getAllShareLinks();
    if (!links[token]) return false;
    delete links[token];
    await saveShareLinks(links);
    return true;
  });
}

export async function getShareLink(token: string): Promise<ShareLink | null> {
  const links = await getAllShareLinks();
  return links[token] || null;
}

export function isExpired(link: ShareLink): boolean {
  if (!link.expiresAt) return false;
  return new Date(link.expiresAt).getTime() < Date.now();
}

export function verifyPin(link: ShareLink, pin?: string): boolean {
  if (!link.pinHash) return true; // 无密码
  if (!pin) return false;
  return hashPin(pin) === link.pinHash;
}

export async function shareTokenExists(token: string): Promise<boolean> {
  const link = await getShareLink(token);
  return !!link;
}

export async function getAllShares(): Promise<Array<{ token: string } & ShareLink>> {
  const links = await getAllShareLinks();
  return Object.entries(links).map(([token, link]) => ({ token, ...link }));
}
