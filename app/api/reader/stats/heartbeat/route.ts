import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

export async function POST(req: NextRequest) {
  const { articleId, deltaMs } = (await req.json()) as {
    articleId?: string;
    deltaMs?: number;
  };
  if (!articleId || typeof deltaMs !== 'number' || deltaMs < 0) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cur = await stores.stats().get();
  const next = {
    ...cur,
    dailyMinutes: {
      ...cur.dailyMinutes,
      [dateKey]: (cur.dailyMinutes[dateKey] || 0) + deltaMs / 60000,
    },
    articleStats: {
      ...cur.articleStats,
      [articleId]: {
        reads: cur.articleStats[articleId]?.reads ?? 0,
        totalMs: (cur.articleStats[articleId]?.totalMs ?? 0) + deltaMs,
      },
    },
  };
  await stores.stats().set(next);
  return NextResponse.json({ ok: true, data: next });
}
