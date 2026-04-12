import { NextRequest, NextResponse } from 'next/server';
import { deleteFolder, exists, isFolder } from '@/lib/storage';

// DELETE: 删除文件夹
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const folderPath = decodeURIComponent(params.id);

    // 检查文件夹是否存在
    if (!(await exists(folderPath)) || !(await isFolder(folderPath))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文件夹不存在',
        },
        { status: 404 }
      );
    }

    await deleteFolder(folderPath);

    return NextResponse.json({
      ok: true,
      data: { path: folderPath },
    });
  } catch (error) {
    console.error('删除文件夹失败:', error);
    return NextResponse.json(
      {
        ok: false,
        error: '删除文件夹失败',
      },
      { status: 500 }
    );
  }
}
