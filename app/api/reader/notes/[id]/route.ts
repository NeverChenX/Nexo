import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const patch = (await req.json()) as Partial<{ text: string; anchor: unknown }>;
  const r = await stores.notes().update(params.id, {
    ...(patch as object),
    updatedAt: Date.now(),
  });
  if (!r)
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: r });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ok = await stores.notes().remove(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
