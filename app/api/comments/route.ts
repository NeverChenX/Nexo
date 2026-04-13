import { NextRequest, NextResponse } from 'next/server';
import { getComments, addComment, deleteComment } from '@/lib/comments';

export async function GET(req: NextRequest) {
  const articlePath = req.nextUrl.searchParams.get('path') ?? '';
  if (!articlePath) return NextResponse.json({ ok: false, error: 'Missing path' }, { status: 400 });

  try {
    const comments = await getComments(articlePath);
    return NextResponse.json({ ok: true, data: comments });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path: articlePath, text } = await req.json();
    if (!articlePath || !text?.trim()) {
      return NextResponse.json({ ok: false, error: 'Missing path or text' }, { status: 400 });
    }
    const comment = await addComment(articlePath, text.trim());
    return NextResponse.json({ ok: true, data: comment });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to add comment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const articlePath = req.nextUrl.searchParams.get('path') ?? '';
  const commentId = req.nextUrl.searchParams.get('id') ?? '';
  if (!articlePath || !commentId) {
    return NextResponse.json({ ok: false, error: 'Missing path or id' }, { status: 400 });
  }

  try {
    const ok = await deleteComment(articlePath, commentId);
    if (!ok) return NextResponse.json({ ok: false, error: 'Comment not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to delete comment' }, { status: 500 });
  }
}
