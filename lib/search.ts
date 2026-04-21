import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

export interface SearchResult {
  path: string;
  title: string;
  matchContext: string;
  /** 匹配的关键词列表（用于前端高亮） */
  matchedTerms: string[];
  score: number;
}

interface QueryAst {
  must: string[];       // AND
  should: string[];     // OR（每组至少一个命中）
  mustNot: string[];    // NOT
}

/**
 * 解析查询：
 *   - 默认每个 token 都是 must（AND）
 *   - `NOT xxx` 或 `-xxx` → must_not
 *   - `xxx OR yyy` → should
 *   - 引号包裹的视作短语
 * 示例: `萨特 AND 自由 NOT 宗教`
 */
export function parseQuery(raw: string): QueryAst {
  const ast: QueryAst = { must: [], should: [], mustNot: [] };
  const tokens: string[] = [];
  // 简单 tokenize：保留引号短语
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    tokens.push((m[1] || m[2]).trim());
  }
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.toUpperCase() === 'AND') { i++; continue; }
    if (tok.toUpperCase() === 'NOT') {
      if (tokens[i + 1]) ast.mustNot.push(tokens[i + 1].toLowerCase());
      i += 2; continue;
    }
    if (tok.startsWith('-') && tok.length > 1) {
      ast.mustNot.push(tok.slice(1).toLowerCase());
      i++; continue;
    }
    // 下一个是 OR 就把当前和下下一个放进 should 组
    if (tokens[i + 1]?.toUpperCase() === 'OR' && tokens[i + 2]) {
      ast.should.push(tok.toLowerCase(), tokens[i + 2].toLowerCase());
      i += 3; continue;
    }
    ast.must.push(tok.toLowerCase());
    i++;
  }
  return ast;
}

export async function searchArticles(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const ast = parseQuery(query);
  if (ast.must.length === 0 && ast.should.length === 0 && ast.mustNot.length === 0) return [];
  const results: SearchResult[] = [];
  await walkAndSearch(WIKI_DATA_DIR, '', ast, results);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

async function walkAndSearch(
  dirPath: string,
  relativePath: string,
  ast: QueryAst,
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
      await walkAndSearch(fullPath, relPath, ast, results);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const result = matchArticle(relPath, content, ast);
        if (result) results.push(result);
      } catch { /* skip */ }
    }
  }
}

function matchArticle(articlePath: string, content: string, ast: QueryAst): SearchResult | null {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim()
    : articlePath.replace(/\.md$/, '').replace(/_index$/, '').split('/').pop() || '';
  const displayPath = articlePath.replace(/\.md$/, '').replace(/\/_index$/, '');
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  const lowerPath = displayPath.toLowerCase();

  // must_not：任一命中则排除
  for (const neg of ast.mustNot) {
    if (lowerTitle.includes(neg) || lowerContent.includes(neg) || lowerPath.includes(neg)) {
      return null;
    }
  }
  // must：必须全部命中
  for (const m of ast.must) {
    if (!lowerTitle.includes(m) && !lowerContent.includes(m) && !lowerPath.includes(m)) {
      return null;
    }
  }
  // should：有至少一个命中
  if (ast.should.length > 0) {
    const anyHit = ast.should.some((s) =>
      lowerTitle.includes(s) || lowerContent.includes(s) || lowerPath.includes(s),
    );
    if (!anyHit) return null;
  }

  // 打分
  let score = 0;
  const matchedTerms: string[] = [];
  let matchContext = '';
  const hitInContent = (term: string) => {
    if (lowerTitle.includes(term)) { score += 100; matchedTerms.push(term); if (!matchContext) matchContext = title; }
    if (lowerPath.includes(term)) { score += 50; if (!matchedTerms.includes(term)) matchedTerms.push(term); }
    const idx = lowerContent.indexOf(term);
    if (idx >= 0) {
      score += 10;
      if (!matchedTerms.includes(term)) matchedTerms.push(term);
      if (!matchContext) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + term.length + 80);
        let snippet = content.slice(start, end).replace(/\s+/g, ' ').trim();
        if (start > 0) snippet = '…' + snippet;
        if (end < content.length) snippet = snippet + '…';
        matchContext = snippet;
      }
    }
  };
  for (const t of ast.must) hitInContent(t);
  for (const t of ast.should) hitInContent(t);

  if (score === 0) return null;
  if (!matchContext) matchContext = title;
  return { path: displayPath, title, matchContext, matchedTerms, score };
}
