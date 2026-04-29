import { NextRequest, NextResponse } from 'next/server';
import { stores, histKey } from '@/lib/reader/server-factory';
import type { HistoryEntry } from '@/lib/reader/types';

export async function GET() {
  const all = await stores.history().list();
  const sorted = [...all].sort((a, b) => b.lastReadAt - a.lastReadAt);
  return NextResponse.json({ ok: true, data: sorted });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<HistoryEntry>;
  if (!body.articleId) {
    return NextResponse.json(
      { ok: false, error: 'articleId required' },
      { status: 400 },
    );
  }
  const id = histKey(body.articleId);
  const existing = await stores.history().findById(id);
  if (existing) {
    const merged = await stores.history().update(id, {
      lastReadAt: body.lastReadAt ?? existing.lastReadAt,
      lastReadProgress: body.lastReadProgress ?? existing.lastReadProgress,
      scrollPos: body.scrollPos ?? existing.scrollPos,
      reads: body.reads ?? existing.reads,
      completedAt: body.completedAt ?? existing.completedAt,
    });
    return NextResponse.json({ ok: true, data: merged });
  }
  const created: HistoryEntry & { id: string } = {
    id,
    articleId: body.articleId,
    lastReadAt: body.lastReadAt ?? Date.now(),
    lastReadProgress: body.lastReadProgress ?? 0,
    scrollPos: body.scrollPos ?? 0,
    reads: body.reads ?? 1,
    completedAt: body.completedAt,
  };
  await stores.history().insert(created);
  return NextResponse.json({ ok: true, data: created });
}
