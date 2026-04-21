import { NextRequest, NextResponse } from 'next/server';
import {
  readArticle,
  writeArticle,
  isArticle,
  isFolder,
  isFolderPage,
  deleteArticle,
  deleteFolder,
  promoteParentIfNeeded,
  getRecursiveTree,
} from '@/lib/storage';
import { getOrCreateId, getPathById, updatePath, removePath } from '@/lib/article-id';
import { verifyApiKey } from '@/lib/api-auth';

// GET: 读取页面 / 获取页面列表
export async function GET(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  try {
    const action = request.nextUrl.searchParams.get('action') || 'read';

    // 获取页面树
    if (action === 'tree') {
      const tree = await getRecursiveTree();
      return NextResponse.json({ ok: true, data: tree });
    }

    // 读取单个页面
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
        { ok: false, error: '缺少 path 或 id 参数。获取页面树请传 ?action=tree' },
        { status: 400 }
      );
    }

    if (!(await isArticle(articlePath))) {
      return NextResponse.json(
        { ok: false, error: '页面不存在' },
        { status: 404 }
      );
    }

    const content = await readArticle(articlePath);
    const folderPage = await isFolder(articlePath);
    const id = getOrCreateId(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id, content, isFolder: folderPage },
    });
  } catch (error) {
    console.error('[v1/pages GET]', error);
    return NextResponse.json({ ok: false, error: '读取失败' }, { status: 500 });
  }
}

// POST: 创建页面
export async function POST(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { path: articlePath, content = '', overwrite = false } = body;

    if (!articlePath || typeof articlePath !== 'string') {
      return NextResponse.json(
        { ok: false, error: '缺少 path 参数' },
        { status: 400 }
      );
    }

    const lastSlash = articlePath.lastIndexOf('/');
    if (lastSlash > 0) {
      const parentPath = articlePath.substring(0, lastSlash);
      await promoteParentIfNeeded(parentPath);
    }

    const exists = await isArticle(articlePath);

    if (exists && !overwrite) {
      return NextResponse.json(
        { ok: false, error: '页面已存在。如需覆盖请传 overwrite: true' },
        { status: 409 }
      );
    }

    await writeArticle(articlePath, content);
    const id = getOrCreateId(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id, content, created: !exists, updated: exists },
    });
  } catch (error) {
    console.error('[v1/pages POST]', error);
    return NextResponse.json({ ok: false, error: '创建失败' }, { status: 500 });
  }
}

// PUT: 更新页面内容
export async function PUT(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { path: articlePath, id: articleId, content } = body;

    let resolvedPath = articlePath;
    if (!resolvedPath && articleId) {
      resolvedPath = getPathById(articleId);
    }

    if (!resolvedPath || typeof resolvedPath !== 'string') {
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

    if (!(await isArticle(resolvedPath))) {
      return NextResponse.json(
        { ok: false, error: '页面不存在' },
        { status: 404 }
      );
    }

    await writeArticle(resolvedPath, content);
    const id = getOrCreateId(resolvedPath);

    return NextResponse.json({
      ok: true,
      data: { path: resolvedPath, id, content },
    });
  } catch (error) {
    console.error('[v1/pages PUT]', error);
    return NextResponse.json({ ok: false, error: '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除页面
export async function DELETE(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

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

    if (await isFolderPage(articlePath)) {
      await deleteFolder(articlePath);
      removePath(articlePath);
      return NextResponse.json({ ok: true, data: { path: articlePath } });
    }

    if (!(await isArticle(articlePath))) {
      return NextResponse.json(
        { ok: false, error: '页面不存在' },
        { status: 404 }
      );
    }

    await deleteArticle(articlePath);
    removePath(articlePath);
    return NextResponse.json({ ok: true, data: { path: articlePath } });
  } catch (error) {
    console.error('[v1/pages DELETE]', error);
    return NextResponse.json({ ok: false, error: '删除失败' }, { status: 500 });
  }
}
