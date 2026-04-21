import fs from 'fs/promises';
import path from 'path';
import { parseFrontmatter } from '@/lib/frontmatter';
import { computeStats } from '@/lib/doc-stats';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

/* ── 类型 ── */

export interface DocEntry {
  path: string;         // 去掉 .md 的相对路径
  title: string;
  content: string;
  wordCount: number;
  tags: string[];
  isFolder: boolean;
  mtime: number;        // 文件修改时间戳
}

/* ── 缓存核心 ── */

let cachedDocs: DocEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5_000; // 5 秒 TTL，写操作后手动失效

/** 手动使缓存失效（写入/删除/重命名后调用） */
export function invalidateWikiCache(): void {
  cachedDocs = null;
  cacheTimestamp = 0;
}

/** 获取全量文档列表（带缓存） */
export async function getAllDocs(): Promise<DocEntry[]> {
  const now = Date.now();
  if (cachedDocs && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedDocs;
  }

  const docs: DocEntry[] = [];
  await walkDir(WIKI_DATA_DIR, '', docs);
  cachedDocs = docs;
  cacheTimestamp = Date.now();
  return docs;
}

/* ── 目录遍历（内部） ── */

async function walkDir(dirPath: string, relativePath: string, collector: DocEntry[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  // 批量收集需要 stat 的文件
  const mdFiles: { fullPath: string; relPath: string; name: string; isIndex: boolean }[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await walkDir(fullPath, relPath, collector);
    } else if (entry.name.endsWith('.md')) {
      mdFiles.push({ fullPath, relPath, name: entry.name, isIndex: entry.name === '_index.md' });
    }
  }

  // 并行读取文件内容和 stat
  const results = await Promise.all(
    mdFiles.map(async (f) => {
      try {
        const [content, stat] = await Promise.all([
          fs.readFile(f.fullPath, 'utf-8'),
          fs.stat(f.fullPath),
        ]);
        return { ...f, content, mtime: stat.mtimeMs };
      } catch {
        return null;
      }
    }),
  );

  for (const r of results) {
    if (!r) continue;
    const displayPath = r.relPath.replace(/\.md$/, '').replace(/\/_index$/, '');
    const titleMatch = r.content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : displayPath.split('/').pop() || '';
    const { frontmatter } = parseFrontmatter(r.content);
    const stats = computeStats(r.content);

    collector.push({
      path: displayPath,
      title,
      content: r.content,
      wordCount: stats.wordCount,
      tags: frontmatter.tags || [],
      isFolder: r.isIndex,
      mtime: r.mtime,
    });
  }
}
