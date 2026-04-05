import { NextRequest, NextResponse } from 'next/server';
import { deleteArticle, isArticle } from '@/lib/storage';

// DELETE: 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articlePath = decodeURIComponent(params.id);

    // 检查文章是否存在
    if (!(await isArticle(articlePath))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章不存在',
        },
        { status: 404 }
      );
    }

    await deleteArticle(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '删除文章失败',
      },
      { status: 500 }
    );
  }
}
