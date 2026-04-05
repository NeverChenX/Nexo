import { NextRequest, NextResponse } from 'next/server';
import {
  readArticle,
  writeArticle,
  exists,
  isArticle,
} from '@/lib/storage';

// GET: 读取文章内容
export async function GET(request: NextRequest) {
  try {
    const articlePath = request.nextUrl.searchParams.get('path');

    if (!articlePath) {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

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

    const content = await readArticle(articlePath);

    return NextResponse.json({
      ok: true,
      data: {
        path: articlePath,
        content,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '读取文章失败',
      },
      { status: 500 }
    );
  }
}

// POST: 创建文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, content = '' } = body;

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
    if (await isArticle(path)) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章已存在',
        },
        { status: 400 }
      );
    }

    await writeArticle(path, content);

    return NextResponse.json({
      ok: true,
      data: { path, content },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '创建文章失败',
      },
      { status: 500 }
    );
  }
}

// PUT: 更新文章内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, content } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 content 参数',
        },
        { status: 400 }
      );
    }

    // 检查文章是否存在
    if (!(await isArticle(path))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章不存在',
        },
        { status: 404 }
      );
    }

    await writeArticle(path, content);

    return NextResponse.json({
      ok: true,
      data: { path, content },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '更新文章失败',
      },
      { status: 500 }
    );
  }
}
