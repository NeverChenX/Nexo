import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

interface Ctx {
  params: { id: string };
}

// C4: whitelist patch fields. For marks the user-editable surface is the
// color label only; articleId/anchor/text must come from the original create
// call, not a later PATCH.
const ALLOWED_COLORS = new Set(['yellow', 'green', 'blue', 'pink', 'red', 'orange', 'purple']);

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  const color = (raw as { color?: unknown }).color;
  if (color !== undefined) {
    if (typeof color !== 'string' || !ALLOWED_COLORS.has(color)) {
      return NextResponse.json({ ok: false, error: 'invalid color' }, { status: 400 });
    }
    patch.color = color;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'no editable fields' }, { status: 400 });
  }
  patch.updatedAt = Date.now();
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
