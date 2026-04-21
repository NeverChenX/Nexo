import { NextRequest, NextResponse } from 'next/server';
import { readArticle, writeArticle, exists, getRecursiveTree } from '@/lib/storage';
import { verifyApiKey } from '@/lib/api-auth';

/**
 * Inbox 采集统一入口（供前端内部调用、浏览器扩展、bookmarklet 使用）
 *
 * POST /api/inbox
 * Body: { kind?: 'web'|'note'|'highlight', title?, url?, content, tags?[], target? }
 *   target 可选：'quick' 追加到 Inbox/快速笔记/YYYY-MM-DD.md
 *                默认：新建 Inbox/YYYY-MM-DD/${title-or-ts}.md
 *
 * 鉴权：两种模式
 *   - 同域 cookie 请求：直接放行（内部使用）
 *   - 外部（扩展/bookmarklet）：带 Authorization: Bearer <WIKI_API_KEY>
 */
export async function POST(req: NextRequest) {
  // 若带 Authorization 则走 api-key 校验；否则视作同域请求放行
  const hasAuth = req.headers.get('Authorization');
  if (hasAuth) {
    const err = verifyApiKey(req);
    if (err) return err;
  }

  try {
    const body = await req.json();
    const content = typeof body.content === 'string' ? body.content : '';
    const title = (typeof body.title === 'string' ? body.title : '').trim();
    const url = typeof body.url === 'string' ? body.url : '';
    const kind = typeof body.kind === 'string' ? body.kind : 'note';
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : [];
    const target = body.target === 'quick' ? 'quick' : 'item';

    if (!content.trim() && !url) {
      return NextResponse.json({ ok: false, error: '内容或 URL 至少提供一个' }, { status: 400 });
    }

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (target === 'quick') {
      // 追加模式：每日一个文件，单行条目追加到末尾
      const path = `Inbox/快速笔记/${date}`;
      let existing = '';
      if (await exists(path)) {
        try { existing = await readArticle(path); } catch { /* new file */ }
      } else {
        existing = `# 快速笔记 ${date}\n\n`;
      }
      const lines: string[] = [];
      lines.push(`## ${time}`);
      if (title) lines.push(`**${title}**`);
      if (url) lines.push(`来源: <${url}>`);
      if (content.trim()) lines.push('', content.trim());
      if (tags.length > 0) lines.push('', tags.map((t: string) => `#${t}`).join(' '));
      lines.push('');
      const final = existing.endsWith('\n\n') ? existing + lines.join('\n') : existing + '\n\n' + lines.join('\n');
      await writeArticle(path, final);
      return NextResponse.json({ ok: true, data: { path, mode: 'appended' } });
    }

    // item 模式：独立文档
    const safeTitle = (title || (url ? urlToTitle(url) : `采集-${time.replace(':', '')}`))
      .replace(/[\\/]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 80);
    const folder = `Inbox/${date}`;
    let name = safeTitle;
    let full = `${folder}/${name}`;
    let suffix = 1;
    while (await exists(full)) {
      name = `${safeTitle} (${suffix++})`;
      full = `${folder}/${name}`;
    }

    const lines: string[] = [];
    lines.push(`# ${safeTitle}`, '');
    if (url) lines.push(`> 来源: <${url}>  `);
    lines.push(`> 采集时间: ${date} ${time}  `);
    if (kind) lines.push(`> 类型: ${kind}  `);
    lines.push('');
    if (tags.length > 0) lines.push(tags.map((t: string) => `#${t}`).join(' '), '');
    if (content.trim()) lines.push(content.trim());
    await writeArticle(full, lines.join('\n'));

    return NextResponse.json({ ok: true, data: { path: full, mode: 'created' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'inbox failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/inbox?count=1  → { unread: N }
 * 粗略统计 Inbox 下文档总数（供红点提示）
 */
export async function GET(req: NextRequest) {
  try {
    const countMode = req.nextUrl.searchParams.get('count') === '1';
    if (!countMode) {
      return NextResponse.json({ ok: false, error: '使用 count=1' }, { status: 400 });
    }
    const tree = await getRecursiveTree();
    let count = 0;
    const walk = (items: any[]): void => {
      for (const it of items) {
        if (it.isFolder) {
          if (it.path === 'Inbox' || it.path.startsWith('Inbox/')) {
            // 递归 Inbox 内的所有非文件夹项
            const countFiles = (arr: any[]) => {
              for (const a of arr) {
                if (!a.isFolder) count++;
                if (a.children) countFiles(a.children);
              }
            };
            if (it.children) countFiles(it.children);
            return;
          }
          if (it.children) walk(it.children);
        }
      }
    };
    walk(tree as any[]);
    return NextResponse.json({ ok: true, data: { unread: count } });
  } catch {
    return NextResponse.json({ ok: true, data: { unread: 0 } });
  }
}

function urlToTitle(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname;
  } catch {
    return '网页';
  }
}
