import { NextRequest, NextResponse } from 'next/server';
import { deleteArticle, deleteFolder, isArticle, isFolder, isFolderPage } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articlePath = decodeURIComponent(params.id);

    // Folder page: delete entire directory (children included)
    if (await isFolderPage(articlePath)) {
      await deleteFolder(articlePath);
      return NextResponse.json({ ok: true, data: { path: articlePath } });
    }

    // Leaf page: delete the .md file
    if (!(await isArticle(articlePath))) {
      return NextResponse.json({ ok: false, error: '文章不存在' }, { status: 404 });
    }

    await deleteArticle(articlePath);
    return NextResponse.json({ ok: true, data: { path: articlePath } });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json({ ok: false, error: '删除失败' }, { status: 500 });
  }
}
