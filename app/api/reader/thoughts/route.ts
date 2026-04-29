import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '@/lib/reader/server-factory';
import type { Thought } from '@/lib/reader/types';

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId') || undefined;
  const all = await stores.thoughts().list();
  const data = articleId ? all.filter((m) => m.articleId === articleId) : all;
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Thought>;
  if (!body.articleId || !body.anchor || typeof body.text !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const now = Date.now();
  const t: Thought = {
    id: uuidv4(),
    articleId: body.articleId,
    anchor: body.anchor,
    text: body.text,
    createdAt: now,
    updatedAt: now,
  };
  await stores.thoughts().insert(t);
  return NextResponse.json({ ok: true, data: t });
}
