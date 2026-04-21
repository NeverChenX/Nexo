import { NextRequest, NextResponse } from 'next/server';
import { getShareLink, isExpired, verifyPin } from '@/lib/share';
import { readArticle, getRecursiveTree } from '@/lib/storage';

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeItem[];
}

// GET: 通过 token 获取分享的内容
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // 获取分享链接信息
    const shareLink = await getShareLink(token);

    if (!shareLink) {
      return NextResponse.json(
        {
          ok: false,
          error: '分享链接不存在或已过期',
        },
        { status: 404 }
      );
    }

    if (isExpired(shareLink)) {
      return NextResponse.json(
        { ok: false, error: '分享链接已过期', reason: 'expired' },
        { status: 410 },
      );
    }

    // 若有 PIN 密码：校验 header X-Share-Pin 或 query ?pin=
    if (shareLink.pinHash) {
      const pin = request.headers.get('X-Share-Pin') || request.nextUrl.searchParams.get('pin') || undefined;
      if (!verifyPin(shareLink, pin || undefined)) {
        return NextResponse.json(
          { ok: false, error: '需要访问密码', reason: 'need_pin' },
          { status: 401 },
        );
      }
    }

    if (shareLink.type === 'article') {
      // 返回文章内容
      const content = await readArticle(shareLink.path);
      return NextResponse.json({
        ok: true,
        data: {
          type: 'article',
          path: shareLink.path,
          content,
        },
      });
    } else if (shareLink.type === 'folder') {
      // 返回文件夹树结构
      const tree = await getRecursiveTree();

      // 提取指定文件夹的子树
      function findSubtree(
        items: TreeItem[],
        targetPath: string
      ): TreeItem[] | null {
        for (const item of items) {
          if (item.path === targetPath) {
            return item.children || [];
          }
          if (item.children && item.isFolder) {
            const result = findSubtree(item.children, targetPath);
            if (result) return result;
          }
        }
        return null;
      }

      const subtree = findSubtree(tree as TreeItem[], shareLink.path);

      return NextResponse.json({
        ok: true,
        data: {
          type: 'folder',
          path: shareLink.path,
          contents: subtree || [],
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: '未知的分享类型',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('获取分享内容失败:', error);
    return NextResponse.json(
      {
        ok: false,
        error: '获取分享内容失败',
      },
      { status: 500 }
    );
  }
}
