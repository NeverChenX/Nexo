import { NextRequest, NextResponse } from 'next/server';
import {
  createShareLink,
  deleteShareLink,
  getAllShares,
} from '@/lib/share';
import { exists } from '@/lib/storage';

// POST: 创建分享链接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, type } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    if (!type || !['article', 'folder'].includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'type 必须是 article 或 folder',
        },
        { status: 400 }
      );
    }

    // 检查路径是否存在
    if (!(await exists(path))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文件或文件夹不存在',
        },
        { status: 404 }
      );
    }

    const pin = typeof body.pin === 'string' && body.pin.trim() ? body.pin.trim() : undefined;
    const expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : undefined;

    const token = await createShareLink(path, type, { pin, expiresInDays });

    return NextResponse.json({
      ok: true,
      data: { token, path, type, hasPin: !!pin, expiresInDays: expiresInDays || null },
    });
  } catch (error) {
    console.error('创建分享链接失败:', error);
    return NextResponse.json(
      {
        ok: false,
        error: '创建分享链接失败',
      },
      { status: 500 }
    );
  }
}

// DELETE: 删除分享链接
export async function DELETE(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 token 参数',
        },
        { status: 400 }
      );
    }

    const success = await deleteShareLink(token);

    if (!success) {
      return NextResponse.json(
        {
          ok: false,
          error: '分享链接不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { token },
    });
  } catch (error) {
    console.error('删除分享链接失败:', error);
    return NextResponse.json(
      {
        ok: false,
        error: '删除分享链接失败',
      },
      { status: 500 }
    );
  }
}

// GET: 获取所有分享链接
export async function GET(request: NextRequest) {
  try {
    const shares = await getAllShares();
    return NextResponse.json({
      ok: true,
      data: shares,
    });
  } catch (error) {
    console.error('获取分享链接失败:', error);
    return NextResponse.json(
      {
        ok: false,
        error: '获取分享链接失败',
      },
      { status: 500 }
    );
  }
}
