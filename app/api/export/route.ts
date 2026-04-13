import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

function safePath(articlePath: string): string {
  const resolved = path.resolve(WIKI_DATA_DIR, articlePath);
  if (!resolved.startsWith(WIKI_DATA_DIR + path.sep) && resolved !== WIKI_DATA_DIR) {
    throw new Error('Invalid path');
  }
  return resolved;
}

export async function GET(req: NextRequest) {
  const articlePath = req.nextUrl.searchParams.get('path') ?? '';
  const format = req.nextUrl.searchParams.get('format') ?? 'md';

  if (!articlePath) {
    return NextResponse.json({ ok: false, error: 'Missing path' }, { status: 400 });
  }

  try {
    // 尝试读取文件
    let filePath = safePath(articlePath + '.md');
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      filePath = safePath(articlePath + '/_index.md');
      content = await fs.readFile(filePath, 'utf-8');
    }

    const filename = articlePath.split('/').pop() || 'document';

    if (format === 'html') {
      // 简单的 HTML 包装
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : filename;
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 20px; color: #37352f; line-height: 1.7; }
h1 { font-size: 1.875em; font-weight: 700; margin-top: 40px; }
h2 { font-size: 1.375em; font-weight: 600; margin-top: 32px; }
h3 { font-size: 1.15em; font-weight: 600; margin-top: 26px; }
code { background: #f7f6f3; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.875em; }
pre { background: #f7f6f3; padding: 1.2em; border-radius: 4px; overflow-x: auto; }
pre code { background: none; padding: 0; font-size: 0.9em; }
blockquote { border-left: 2px solid rgba(55,53,47,0.16); padding: 4px 0 4px 16px; margin: 8px 0; color: #787774; }
table { border-collapse: collapse; width: 100%; margin: 4px 0; font-size: 14px; }
th, td { border: 1px solid #e6e5e3; padding: 8px 10px; text-align: left; }
th { background: #f7f6f3; font-weight: 500; }
img { max-width: 100%; }
hr { border: none; border-top: 1px solid #e6e5e3; margin: 24px 0; }
a { color: #37352f; text-decoration: underline; }
</style>
</head>
<body>
<pre style="white-space: pre-wrap; background: none; padding: 0; font-family: inherit;">${escapeHtml(content)}</pre>
</body>
</html>`;
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.html"`,
        },
      });
    }

    // 默认 Markdown
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.md"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ ok: false, error: message }, { status: 404 });
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
