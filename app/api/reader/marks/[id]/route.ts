import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

interface Ctx {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const patch = await req.json();
  const r = await stores.marks().update(params.id, patch);
  if (!r)
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: r });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ok = await stores.marks().remove(params.id);
  if (!ok)
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
