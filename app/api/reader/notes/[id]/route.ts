import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

// C4: whitelist patch fields explicitly so callers can't mutate articleId /
// anchor / id and silently corrupt cross-anchor relations. Only `text` is
// user-writable post-create.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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
  const text = (raw as { text?: unknown }).text;
  if (text !== undefined) {
    if (typeof text !== 'string' || text.length > 20_000) {
      return NextResponse.json({ ok: false, error: 'invalid text' }, { status: 400 });
    }
    patch.text = text;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'no editable fields' }, { status: 400 });
  }
  patch.updatedAt = Date.now();
  const r = await stores.notes().update(params.id, patch);
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
