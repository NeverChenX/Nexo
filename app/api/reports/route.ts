import { NextRequest, NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/wiki-cache';
import { exists, writeArticle } from '@/lib/storage';

/**
 * 生成周报/月报/年报并写入 wiki。
 *
 * GET /api/reports?period=week|month|year
 *   返回报告元数据（预览）
 * POST /api/reports  { period: 'week'|'month'|'year' }
 *   写入 报告/周报/YYYY-Www.md 等
 */

function weekOfYear(d: Date): { year: number; week: number } {
  // ISO 周（周一为一周第一天）
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.floor(diff / 7);
  return { year: target.getFullYear(), week };
}

interface PeriodStats {
  label: string;
  path: string;
  startMs: number;
  endMs: number;
  newCount: number;
  updatedCount: number;
  totalWords: number;
  tagUsage: Array<{ tag: string; count: number }>;
  topDocs: Array<{ path: string; title: string; mtime: number; wordCount: number }>;
}

async function compute(period: 'week' | 'month' | 'year', refDate: Date): Promise<PeriodStats> {
  let startMs: number; let endMs: number; let label: string; let reportPath: string;
  if (period === 'week') {
    const { year, week } = weekOfYear(refDate);
    label = `${year} 年第 ${week} 周`;
    reportPath = `报告/周报/${year}-W${String(week).padStart(2, '0')}`;
    // 本周开始（周一 00:00）
    const monday = new Date(refDate);
    const day = (monday.getDay() + 6) % 7;
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day);
    startMs = monday.getTime();
    endMs = startMs + 7 * 86400000;
  } else if (period === 'month') {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    label = `${y} 年 ${m + 1} 月`;
    reportPath = `报告/月报/${y}-${String(m + 1).padStart(2, '0')}`;
    startMs = new Date(y, m, 1, 0, 0, 0).getTime();
    endMs = new Date(y, m + 1, 1, 0, 0, 0).getTime();
  } else {
    const y = refDate.getFullYear();
    label = `${y} 年度`;
    reportPath = `报告/年报/${y}`;
    startMs = new Date(y, 0, 1, 0, 0, 0).getTime();
    endMs = new Date(y + 1, 0, 1, 0, 0, 0).getTime();
  }

  const docs = await getAllDocs();
  const inPeriod = docs.filter((d) => d.mtime >= startMs && d.mtime < endMs);
  const tagCount = new Map<string, number>();
  let totalWords = 0;
  for (const d of inPeriod) {
    totalWords += d.wordCount;
    for (const tag of d.tags) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
  }
  const tagUsage = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const topDocs = inPeriod
    .sort((a, b) => b.wordCount - a.wordCount)
    .slice(0, 10)
    .map((d) => ({ path: d.path, title: d.title, mtime: d.mtime, wordCount: d.wordCount }));

  // 没有 ctime 区分，直接合并为"活跃文档"
  const activeCount = inPeriod.length;
  return { label, path: reportPath, startMs, endMs, newCount: activeCount, updatedCount: 0, totalWords, tagUsage, topDocs };
}

function renderMarkdown(s: PeriodStats): string {
  const startDate = new Date(s.startMs).toLocaleDateString();
  const endDate = new Date(s.endMs - 1).toLocaleDateString();
  const lines: string[] = [];
  lines.push(`# ${s.label}`, '');
  lines.push(`> 统计范围: ${startDate} – ${endDate}`, '');
  lines.push('## 📊 总览', '');
  lines.push(`- 活跃文档: **${s.newCount}** 篇（新增或更新）`);
  lines.push(`- 字数合计: **${s.totalWords.toLocaleString()}** 字`, '');

  if (s.tagUsage.length > 0) {
    lines.push('## 🏷 热门标签', '');
    for (const { tag, count } of s.tagUsage) {
      lines.push(`- \`#${tag}\` × ${count}`);
    }
    lines.push('');
  }

  if (s.topDocs.length > 0) {
    lines.push('## 📚 最多字数文档 Top 10', '');
    for (const d of s.topDocs) {
      lines.push(`- [[${d.path}|${d.title}]] — ${d.wordCount} 字 · ${new Date(d.mtime).toLocaleDateString()}`);
    }
    lines.push('');
  }

  lines.push('---', '', `*自动生成于 ${new Date().toLocaleString()}*`);
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get('period') || 'week') as 'week' | 'month' | 'year';
  if (!['week', 'month', 'year'].includes(period)) {
    return NextResponse.json({ ok: false, error: 'period 必须是 week/month/year' }, { status: 400 });
  }
  const stats = await compute(period, new Date());
  const markdown = renderMarkdown(stats);
  return NextResponse.json({ ok: true, data: { ...stats, markdown } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const period = (body.period || 'week') as 'week' | 'month' | 'year';
    if (!['week', 'month', 'year'].includes(period)) {
      return NextResponse.json({ ok: false, error: 'period 必须是 week/month/year' }, { status: 400 });
    }
    const stats = await compute(period, new Date());
    const md = renderMarkdown(stats);

    // 若已存在报告，覆盖写（重新生成）
    await writeArticle(stats.path, md);
    return NextResponse.json({ ok: true, data: { path: stats.path, markdown: md } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'generate failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
