import { NextRequest, NextResponse } from 'next/server';
import { listSnapshots, readSnapshot } from '@/lib/history';
import { writeArticle, readArticle, isArticle } from '@/lib/storage';
import { saveSnapshot } from '@/lib/history';

/**
 * GET /api/history?path=xxx           → 列表
 * GET /api/history?path=xxx&ts=YYYY-… → 读单个快照内容
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('path');
  const ts = req.nextUrl.searchParams.get('ts');
  if (!p) return NextResponse.json({ ok: false, error: '缺少 path' }, { status: 400 });
  if (ts) {
    const content = await readSnapshot(p, ts);
    if (content === null) return NextResponse.json({ ok: false, error: '快照不存在' }, { status: 404 });
    return NextResponse.json({ ok: true, data: { timestamp: ts, content } });
  }
  const list = await listSnapshots(p);
  return NextResponse.json({ ok: true, data: list });
}

/**
 * POST /api/history/restore  {path, ts}
 * 用 ts 对应的快照内容回滚当前文档（回滚前也对当前做一次快照，防误操作）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: p, ts } = body;
    if (!p || !ts) return NextResponse.json({ ok: false, error: '缺少 path 或 ts' }, { status: 400 });
    if (!(await isArticle(p))) return NextResponse.json({ ok: false, error: '文章不存在' }, { status: 404 });

    const snap = await readSnapshot(p, ts);
    if (snap === null) return NextResponse.json({ ok: false, error: '快照不存在' }, { status: 404 });

    // 回滚前先把当前版本做一次快照
    try {
      const cur = await readArticle(p);
      await saveSnapshot(p, cur);
    } catch { /* ignore */ }

    await writeArticle(p, snap);
    return NextResponse.json({ ok: true, data: { path: p, restored: ts } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'restore failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
