import { NextRequest, NextResponse } from 'next/server';
import {
  createFolder,
  getFolderContents,
  getRecursiveTree,
  exists,
  isFolder,
  renameFolder,
} from '@/lib/storage';

// GET: 获取文件夹内容或完整树
export async function GET(request: NextRequest) {
  try {
    const folderPath = request.nextUrl.searchParams.get('path') || '';
    const includeTree = request.nextUrl.searchParams.get('tree') === 'true';

    if (includeTree) {
      // 返回完整的递归树结构
      const tree = await getRecursiveTree();
      return NextResponse.json({
        ok: true,
        data: tree,
      });
    } else {
      // 返回指定文件夹的内容
      const contents = await getFolderContents(folderPath);
      return NextResponse.json({
        ok: true,
        data: contents,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '获取文件夹内容失败',
      },
      { status: 500 }
    );
  }
}

// POST: 创建文件夹
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    // 检查是否已存在
    if (await exists(path)) {
      return NextResponse.json(
        {
          ok: false,
          error: '文件夹已存在',
        },
        { status: 400 }
      );
    }

    await createFolder(path);

    return NextResponse.json({
      ok: true,
      data: { path },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '创建文件夹失败',
      },
      { status: 500 }
    );
  }
}

// PUT: 重命名文件夹
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPath, newPath } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { ok: false, error: '缺少 oldPath 或 newPath 参数' },
        { status: 400 }
      );
    }

    if (!(await exists(oldPath)) || !(await isFolder(oldPath))) {
      return NextResponse.json(
        { ok: false, error: '原文件夹不存在' },
        { status: 404 }
      );
    }

    if (await exists(newPath)) {
      return NextResponse.json(
        { ok: false, error: '目标名称已存在' },
        { status: 400 }
      );
    }

    await renameFolder(oldPath, newPath);

    return NextResponse.json({
      ok: true,
      data: { oldPath, newPath },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: '重命名文件夹失败' },
      { status: 500 }
    );
  }
}
