import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');
const HISTORY_DIR = path.join(process.cwd(), 'wiki-data', '.history');

const MAX_SNAPSHOTS_PER_DOC = 50;
const RETENTION_DAYS = 30;

function sanitizeForFs(p: string): string {
  return p.replace(/[\\/]/g, '__');
}

function historyDirFor(articlePath: string): string {
  return path.join(HISTORY_DIR, sanitizeForFs(articlePath));
}

export async function saveSnapshot(articlePath: string, content: string): Promise<void> {
  if (articlePath.startsWith('.history/') || articlePath.includes('/.history/')) return; // 不给历史自身快照
  try {
    const dir = historyDirFor(articlePath);
    await fs.mkdir(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `${ts}.md`);
    await fs.writeFile(file, content, 'utf-8');
    // 保留策略：按修改时间倒序保留最多 N 份 + 30 天内
    const entries = await fs.readdir(dir);
    const metas = await Promise.all(entries.map(async (e) => {
      const full = path.join(dir, e);
      const st = await fs.stat(full);
      return { name: e, full, mtime: st.mtimeMs };
    }));
    metas.sort((a, b) => b.mtime - a.mtime);
    const cutoff = Date.now() - RETENTION_DAYS * 86400000;
    for (let i = 0; i < metas.length; i++) {
      const m = metas[i];
      if (i >= MAX_SNAPSHOTS_PER_DOC || m.mtime < cutoff) {
        try { await fs.unlink(m.full); } catch { /* ignore */ }
      }
    }
  } catch {
    // 快照失败不影响主保存流程
  }
}

export interface SnapshotMeta {
  timestamp: string;      // filename 的 ISO
  size: number;
}

export async function listSnapshots(articlePath: string): Promise<SnapshotMeta[]> {
  try {
    const dir = historyDirFor(articlePath);
    const entries = await fs.readdir(dir);
    const metas: SnapshotMeta[] = [];
    for (const e of entries) {
      if (!e.endsWith('.md')) continue;
      const full = path.join(dir, e);
      const st = await fs.stat(full);
      metas.push({
        timestamp: e.replace(/\.md$/, ''),
        size: st.size,
      });
    }
    metas.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return metas;
  } catch {
    return [];
  }
}

export async function readSnapshot(articlePath: string, timestamp: string): Promise<string | null> {
  try {
    const dir = historyDirFor(articlePath);
    const safe = timestamp.replace(/[^\w.:-]/g, '');
    const file = path.join(dir, `${safe}.md`);
    if (!file.startsWith(HISTORY_DIR)) return null;
    return await fs.readFile(file, 'utf-8');
  } catch {
    return null;
  }
}

// 暴露 WIKI_DATA_DIR 给外部（可选）
export { WIKI_DATA_DIR, HISTORY_DIR };
