import { NextRequest, NextResponse } from 'next/server';
import {
  readArticle,
  writeArticle,
  isArticle,
  isFolder,
  promoteParentIfNeeded,
  renameArticle,
  moveArticle,
} from '@/lib/storage';
import { getOrCreateId, getPathById, getIdChain, updatePath, removePath } from '@/lib/article-id';

// GET: 读取文章内容
export async function GET(request: NextRequest) {
  try {
    const rawPath = request.nextUrl.searchParams.get('path');
    const articleId = request.nextUrl.searchParams.get('id');
    let articlePath: string | null = null;

    if (articleId) {
      articlePath = getPathById(articleId);
    } else if (rawPath) {
      articlePath = rawPath;
    }

    if (!articlePath) {
      return NextResponse.json(
        { ok: false, error: '缺少 path 或 id 参数' },
        { status: 400 }
      );
    }

    const isArt = await isArticle(articlePath);
    const folderPage = await isFolder(articlePath);

    if (!isArt && !folderPage) {
      return NextResponse.json(
        { ok: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    // 纯目录（非父页面、无 _index.md）也允许返回，让前端渲染文件夹视图
    const content = isArt ? await readArticle(articlePath) : '';
    const id = getOrCreateId(articlePath);
    const idChain = getIdChain(articlePath);

    return NextResponse.json({
      ok: true,
      data: {
        path: articlePath,
        id,
        idChain,
        content,
        isFolder: folderPage,
      },
    });
  } catch (error) {
    console.error('读取文章失败:', error);
    return NextResponse.json(
      { ok: false, error: '读取文章失败' },
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
      await promoteParentIfNeeded(parentPath);
    }

    if (await isArticle(articlePath)) {
      return NextResponse.json({ ok: false, error: '文章已存在' }, { status: 400 });
    }

    await writeArticle(articlePath, content);
    const id = getOrCreateId(articlePath);
    const idChain = getIdChain(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id, idChain, content },
    });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json({ ok: false, error: '创建文章失败' }, { status: 500 });
  }
}

// PUT: 更新文章内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: rawPath, id: rawId, content } = body;

    let articlePath = rawPath;
    if (!articlePath && rawId) {
      articlePath = getPathById(rawId);
    }

    if (!articlePath || typeof articlePath !== 'string') {
      return NextResponse.json(
        { ok: false, error: '缺少 path 或 id 参数' },
        { status: 400 }
      );
    }

    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json(
        { ok: false, error: '缺少 content 参数' },
        { status: 400 }
      );
    }

    if (!(await isArticle(articlePath))) {
      return NextResponse.json(
        { ok: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    // 版本快照（写入前保存当前版本作为历史）
    try {
      const old = await readArticle(articlePath);
      if (old && old !== content) {
        const { saveSnapshot } = await import('@/lib/history');
        await saveSnapshot(articlePath, old);
      }
    } catch { /* 历史失败不阻塞 */ }

    await writeArticle(articlePath, content);
    const id = getOrCreateId(articlePath);
    const idChain = getIdChain(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id, idChain, content },
    });
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { ok: false, error: '更新文章失败' },
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

      if (newParentPath) {
        await promoteParentIfNeeded(newParentPath);
      }

      const resultPath = await moveArticle(oldPath, newParentPath);
      updatePath(oldPath, resultPath);
      const id = getOrCreateId(resultPath);
      const idChain = getIdChain(resultPath);

      return NextResponse.json({
        ok: true,
        data: { oldPath, newPath: resultPath, id, idChain, newParentPath },
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
    updatePath(oldPath, newPath);
    const id = getOrCreateId(newPath);
    const idChain = getIdChain(newPath);

    return NextResponse.json({
      ok: true,
      data: { oldPath, newPath, id, idChain },
    });
  } catch (error) {
    console.error('重命名/移动文章失败:', error);
    return NextResponse.json(
      { ok: false, error: '重命名/移动文章失败' },
      { status: 500 }
    );
  }
}
