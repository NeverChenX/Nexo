import { NextRequest, NextResponse } from 'next/server';
import { listTrash, restoreFromTrash, permanentDelete, emptyTrash } from '@/lib/trash';

// GET: 列出回收站
export async function GET() {
  try {
    const items = await listTrash();
    return NextResponse.json({ ok: true, data: items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list trash';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST: 恢复指定项
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const ok = await restoreFromTrash(id);
    if (!ok) return NextResponse.json({ ok: false, error: 'Restore failed or target exists' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Restore failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE: 永久删除或清空回收站
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (id === 'all') {
      await emptyTrash();
      return NextResponse.json({ ok: true });
    }
    if (id) {
      const ok = await permanentDelete(id);
      if (!ok) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
