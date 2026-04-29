import { NextRequest, NextResponse } from 'next/server';
import { stores, favKey } from '@/lib/reader/server-factory';

export async function GET() {
  const data = await stores.favorites().list();
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const { articleId } = (await req.json()) as { articleId?: string };
  if (!articleId) {
    return NextResponse.json(
      { ok: false, error: 'articleId required' },
      { status: 400 },
    );
  }
  const id = favKey(articleId);
  const exists = await stores.favorites().findById(id);
  if (exists) return NextResponse.json({ ok: true, data: exists });
  const fav = { id, articleId, addedAt: Date.now() };
  await stores.favorites().insert(fav);
  return NextResponse.json({ ok: true, data: fav });
}

export async function DELETE(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId');
  if (!articleId) {
    return NextResponse.json(
      { ok: false, error: 'articleId required' },
      { status: 400 },
    );
  }
  const ok = await stores.favorites().remove(favKey(articleId));
  return NextResponse.json({ ok });
}
