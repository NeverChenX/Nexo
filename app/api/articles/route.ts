import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import nodePath from 'path';
import {
  readArticle,
  writeArticle,
  isArticle,
  isFolder,
  promoteToParent,
  renameArticle,
  moveArticle,
} from '@/lib/storage';
import { articlePathToId, findArticlePathById } from '@/lib/article-id';

// GET: 读取文章内容
export async function GET(request: NextRequest) {
  try {
    const rawPath = request.nextUrl.searchParams.get('path');
    const articleId = request.nextUrl.searchParams.get('id');
    let articlePath = rawPath;

    if (!articlePath && articleId) {
      articlePath = await findArticlePathById(articleId);
    }

    if (!articlePath) {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 或 id 参数',
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
    const folderPage = await isFolder(articlePath);

    return NextResponse.json({
      ok: true,
      data: {
        path: articlePath,
        id: articlePathToId(articlePath),
        content,
        isFolder: folderPage,
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
    const { path: articlePath, content = '' } = body;

    if (!articlePath || typeof articlePath !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 path 参数' }, { status: 400 });
    }

    // Auto-promote parent leaf page when adding first sub-page
    const lastSlash = articlePath.lastIndexOf('/');
    if (lastSlash > 0) {
      const parentPath = articlePath.substring(0, lastSlash);
      const parentLeafFile = nodePath.join(process.cwd(), 'wiki-data', `${parentPath}.md`);
      try {
        await fs.stat(parentLeafFile);
        // Parent is a leaf page — promote it to a parent page
        await promoteToParent(parentPath);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        // Parent is already a directory or doesn't exist — fine
      }
    }

    if (await isArticle(articlePath)) {
      return NextResponse.json({ ok: false, error: '文章已存在' }, { status: 400 });
    }

    await writeArticle(articlePath, content);
    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id: articlePathToId(articlePath), content },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: '创建文章失败' }, { status: 500 });
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
      data: { path, id: articlePathToId(path), content },
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

// PATCH: 重命名或移动文章
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPath, newPath, newParentPath } = body;

    // 移动操作
    if (oldPath && newParentPath !== undefined) {
      if (!(await isArticle(oldPath))) {
        return NextResponse.json(
          { ok: false, error: '原文章不存在' },
          { status: 404 }
        );
      }

      const resultPath = await moveArticle(oldPath, newParentPath);

      return NextResponse.json({
        ok: true,
        data: {
          oldPath,
          oldId: articlePathToId(oldPath),
          newPath: resultPath,
          newId: articlePathToId(resultPath),
          newParentPath,
        },
      });
    }

    // 重命名操作
    if (!oldPath || !newPath) {
      return NextResponse.json(
        { ok: false, error: '缺少 oldPath 或 newPath 参数' },
        { status: 400 }
      );
    }

    if (!(await isArticle(oldPath))) {
      return NextResponse.json(
        { ok: false, error: '原文章不存在' },
        { status: 404 }
      );
    }

    if (await isArticle(newPath)) {
      return NextResponse.json(
        { ok: false, error: '目标名称已存在' },
        { status: 400 }
      );
    }

    await renameArticle(oldPath, newPath);

    return NextResponse.json({
      ok: true,
      data: {
        oldPath,
        oldId: articlePathToId(oldPath),
        newPath,
        newId: articlePathToId(newPath),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || '重命名/移动文章失败' },
      { status: 500 }
    );
  }
}
