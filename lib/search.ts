import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

export interface SearchResult {
  path: string;
  title: string;
  matchContext: string;
  score: number;
}

/**
 * 全文搜索：遍历所有 .md 文件，匹配标题和内容
 */
export async function searchArticles(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  await walkAndSearch(WIKI_DATA_DIR, '', q, results);

  // 按分数降序，取 top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

async function walkAndSearch(
  dirPath: string,
  relativePath: string,
  query: string,
  results: SearchResult[],
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await walkAndSearch(fullPath, relPath, query, results);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const result = matchArticle(relPath, content, query);
        if (result) results.push(result);
      } catch {
        // skip unreadable files
      }
    }
  }
}

function matchArticle(articlePath: string, content: string, query: string): SearchResult | null {
  // 提取标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : articlePath.replace(/\.md$/, '').replace(/_index$/, '').split('/').pop() || '';

  // 清理路径显示（去掉 .md 和 _index）
  const displayPath = articlePath.replace(/\.md$/, '').replace(/\/_index$/, '');

  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  let score = 0;
  let matchContext = '';

  // 标题匹配权重最高
  if (lowerTitle.includes(query)) {
    score += 100;
    matchContext = title;
  }

  // 路径匹配
  if (displayPath.toLowerCase().includes(query)) {
    score += 50;
  }

  // 内容匹配
  const contentIndex = lowerContent.indexOf(query);
  if (contentIndex >= 0) {
    score += 10;
    // 提取匹配上下文片段
    if (!matchContext) {
      const start = Math.max(0, contentIndex - 40);
      const end = Math.min(content.length, contentIndex + query.length + 60);
      let snippet = content.slice(start, end).replace(/\n/g, ' ').trim();
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
      matchContext = snippet;
    }
  }

  if (score === 0) return null;

  return { path: displayPath, title, matchContext, score };
}
