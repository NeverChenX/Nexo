import { NextRequest, NextResponse } from 'next/server';
import { moveToTrash } from '@/lib/trash';

// POST: 将文章/文件夹移到回收站
export async function POST(req: NextRequest) {
  try {
    const { path: articlePath, isFolder } = await req.json();
    if (!articlePath) {
      return NextResponse.json({ ok: false, error: 'Missing path' }, { status: 400 });
    }
    const item = await moveToTrash(articlePath, !!isFolder);
    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Move to trash failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
