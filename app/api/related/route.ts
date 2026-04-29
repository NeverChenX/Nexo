import { NextRequest, NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/wiki-cache';
import { getIdChain } from '@/lib/article-id';

/**
 * POST /api/related
 * Body: { content: string, excludePath?: string, topK?: number }
 * 返回: { matches: [{ path, title, score, snippet }] }
 *
 * 实现：不依赖 embedding 的轻量相似度：
 * 1. 从 content 抽取高频关键词（中英文混合，去停用词、长度过滤）
 * 2. 遍历所有已存在文档，统计每篇包含这些关键词的次数（normalized by log(length)）
 * 3. 对匹配分数降序排序，返回 topK
 */

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '这个', '那个', '我们', '他们', '或', '但', '与', '为', '从',
  '而', '更', '会', '还', '然', '可', '能', '不', '无', '里', '中', '以', '把', '被',
  'the', 'a', 'is', 'are', 'was', 'be', 'to', 'of', 'and', 'in', 'that', 'it', 'for',
  'on', 'with', 'as', 'at', 'by', 'from', 'this', 'these', 'those', 'not', 'or', 'but',
  'an', 'we', 'you', 'they', 'he', 'she', 'has', 'have', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'can', 'if', 'then', 'there', 'here',
]);

/** 提取 content 的关键词 Top N */
function extractKeywords(content: string, topN = 10): string[] {
  // 去代码块、frontmatter、链接 url 等噪声
  const cleaned = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/---[\s\S]*?---/, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ');

  // tokenize：CJK 连续 + 英文单词
  const tokens = cleaned.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z][a-zA-Z0-9_-]{2,20}/g) || [];
  const freq = new Map<string, number>();
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    if (lower.length < 2) continue;
    freq.set(lower, (freq.get(lower) || 0) + 1);
  }
  const entries = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN * 2);
  // 过滤只出现 1 次的
  return entries.filter(([, c]) => c >= 2).slice(0, topN).map(([w]) => w);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content: string = typeof body.content === 'string' ? body.content : '';
    const excludePath: string = typeof body.excludePath === 'string' ? body.excludePath : '';
    const topK: number = Math.min(10, Math.max(1, Number(body.topK || 5)));

    if (content.replace(/\s/g, '').length < 50) {
      return NextResponse.json({ ok: true, data: { matches: [], keywords: [] } });
    }
    const keywords = extractKeywords(content);
    if (keywords.length === 0) {
      return NextResponse.json({ ok: true, data: { matches: [], keywords: [] } });
    }

    const docs = await getAllDocs();
    const scored = docs
      .filter((d) => d.path !== excludePath && !d.isFolder)
      .map((d) => {
        const lower = (d.content || '').toLowerCase();
        const title = (d.title || '').toLowerCase();
        let score = 0;
        const matched: string[] = [];
        for (const kw of keywords) {
          const bodyHits = (lower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          if (bodyHits > 0) {
            score += Math.min(bodyHits, 5); // 单词命中次数封顶 5
            matched.push(kw);
          }
          if (title.includes(kw)) score += 5; // 标题命中加权
        }
        // 按长度归一化，避免长文档占便宜
        const lenNorm = Math.log(1 + d.wordCount / 100);
        const finalScore = score / (1 + lenNorm * 0.5);
        return {
          path: d.path,
          idChain: getIdChain(d.path),
          title: d.title,
          wordCount: d.wordCount,
          score: finalScore,
          matched,
        };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return NextResponse.json({ ok: true, data: { matches: scored, keywords } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '相关文档计算失败';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
