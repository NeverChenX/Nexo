import { NextRequest, NextResponse } from 'next/server';
import { searchArticles } from '@/lib/search';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '20')));

  if (!q.trim()) {
    return NextResponse.json({ ok: true, data: [] });
  }

  try {
    const results = await searchArticles(q, limit);
    return NextResponse.json({ ok: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
