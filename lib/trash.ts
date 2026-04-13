import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');
const TRASH_DIR = path.join(WIKI_DATA_DIR, '.trash');
const TRASH_META = path.join(TRASH_DIR, 'meta.json');

export interface TrashItem {
  id: string;
  originalPath: string;
  isFolder: boolean;
  deletedAt: string;
  name: string;
}

// 进程级锁
let lockPromise: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = lockPromise;
  let resolve: () => void;
  lockPromise = new Promise<void>((r) => { resolve = r; });
  return prev.then(fn).finally(() => resolve!());
}

async function ensureTrashDir() {
  await fs.mkdir(TRASH_DIR, { recursive: true });
}

async function readMeta(): Promise<TrashItem[]> {
  try {
    const raw = await fs.readFile(TRASH_META, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeMeta(items: TrashItem[]) {
  await fs.writeFile(TRASH_META, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * 将文件/文件夹移入回收站
 */
export async function moveToTrash(articlePath: string, isFolder: boolean): Promise<TrashItem> {
  return withLock(async () => {
    await ensureTrashDir();

    const id = crypto.randomBytes(8).toString('hex');
    const name = articlePath.split('/').pop() || articlePath;

    // 源路径
    let sourcePath: string;
    if (isFolder) {
      sourcePath = path.join(WIKI_DATA_DIR, articlePath);
    } else {
      sourcePath = path.join(WIKI_DATA_DIR, articlePath + '.md');
      // 可能是父页面
      try { await fs.access(sourcePath); } catch {
        sourcePath = path.join(WIKI_DATA_DIR, articlePath, '_index.md');
      }
    }

    // 目标路径
    const destPath = path.join(TRASH_DIR, id);

    // 移动
    await fs.rename(sourcePath, destPath);

    const item: TrashItem = {
      id,
      originalPath: articlePath,
      isFolder,
      deletedAt: new Date().toISOString(),
      name,
    };

    const meta = await readMeta();
    meta.unshift(item);
    await writeMeta(meta);

    return item;
  });
}

/**
 * 从回收站恢复
 */
export async function restoreFromTrash(trashId: string): Promise<boolean> {
  return withLock(async () => {
    const meta = await readMeta();
    const idx = meta.findIndex((i) => i.id === trashId);
    if (idx === -1) return false;

    const item = meta[idx];
    const trashPath = path.join(TRASH_DIR, item.id);

    // 恢复到原始路径
    let destPath: string;
    if (item.isFolder) {
      destPath = path.join(WIKI_DATA_DIR, item.originalPath);
    } else {
      destPath = path.join(WIKI_DATA_DIR, item.originalPath + '.md');
    }

    // 确保父目录存在
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // 检查目标是否已存在
    try {
      await fs.access(destPath);
      return false; // 目标已存在，不覆盖
    } catch {
      // 目标不存在，可以安全恢复
    }

    await fs.rename(trashPath, destPath);

    meta.splice(idx, 1);
    await writeMeta(meta);
    return true;
  });
}

/**
 * 永久删除回收站中的项目
 */
export async function permanentDelete(trashId: string): Promise<boolean> {
  return withLock(async () => {
    const meta = await readMeta();
    const idx = meta.findIndex((i) => i.id === trashId);
    if (idx === -1) return false;

    const trashPath = path.join(TRASH_DIR, meta[idx].id);
    try {
      const stat = await fs.stat(trashPath);
      if (stat.isDirectory()) {
        await fs.rm(trashPath, { recursive: true });
      } else {
        await fs.unlink(trashPath);
      }
    } catch { /* already gone */ }

    meta.splice(idx, 1);
    await writeMeta(meta);
    return true;
  });
}

/**
 * 获取回收站列表
 */
export async function listTrash(): Promise<TrashItem[]> {
  await ensureTrashDir();
  return readMeta();
}

/**
 * 清空回收站
 */
export async function emptyTrash(): Promise<void> {
  return withLock(async () => {
    const meta = await readMeta();
    for (const item of meta) {
      const trashPath = path.join(TRASH_DIR, item.id);
      try {
        const stat = await fs.stat(trashPath);
        if (stat.isDirectory()) {
          await fs.rm(trashPath, { recursive: true });
        } else {
          await fs.unlink(trashPath);
        }
      } catch { /* skip */ }
    }
    await writeMeta([]);
  });
}
