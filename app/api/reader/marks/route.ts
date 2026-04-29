import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '@/lib/reader/server-factory';
import type { Mark } from '@/lib/reader/types';

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId') || undefined;
  const all = await stores.marks().list();
  const data = articleId ? all.filter((m) => m.articleId === articleId) : all;
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Mark>;
  if (!body.articleId || !body.anchor || !body.color) {
    return NextResponse.json(
      { ok: false, error: 'articleId, anchor, color required' },
      { status: 400 },
    );
  }
  const m: Mark = {
    id: uuidv4(),
    articleId: body.articleId,
    anchor: body.anchor,
    color: body.color,
    createdAt: Date.now(),
  };
  await stores.marks().insert(m);
  return NextResponse.json({ ok: true, data: m });
}
