import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

function resolveArticlePath(articlePath: string): string | null {
  // 尝试直接文件
  const direct = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  if (fs.existsSync(direct)) return direct;
  // 尝试文件夹 index
  const index = path.join(WIKI_DATA_DIR, articlePath, 'index.md');
  if (fs.existsSync(index)) return index;
  return null;
}

/** 生成排版精美的 HTML（用于浏览器打印为 PDF） */
function generatePrintHtml(title: string, content: string, articlePath: string): string {
  // 简单解析 frontmatter
  let body = content;
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) body = content.slice(end + 4).trim();
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page {
    size: A4;
    margin: 2.5cm 2cm;
    @top-right { content: "${title}"; font-size: 9px; color: #999; }
    @bottom-center { content: counter(page) " / " counter(pages); font-size: 9px; color: #999; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #1a1a1a;
    max-width: 100%;
  }
  /* 封面 */
  .cover {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    text-align: center;
    padding: 80px 40px;
  }
  .cover h1 {
    font-size: 32px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
  }
  .cover .meta {
    font-size: 13px;
    color: #888;
  }
  .cover .divider {
    width: 60px;
    height: 3px;
    background: #2eaadc;
    margin: 24px auto;
    border-radius: 2px;
  }
  /* 内容 */
  h1 { font-size: 24px; font-weight: 700; margin: 32px 0 12px; letter-spacing: -0.02em; }
  h2 { font-size: 20px; font-weight: 700; margin: 28px 0 10px; letter-spacing: -0.01em; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  h3 { font-size: 17px; font-weight: 600; margin: 24px 0 8px; }
  h4 { font-size: 15px; font-weight: 600; margin: 20px 0 6px; color: #444; }
  p { margin: 8px 0; }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  li { margin: 4px 0; }
  blockquote {
    border-left: 3px solid #ddd;
    padding: 8px 16px;
    margin: 12px 0;
    color: #555;
    background: #f9f9f9;
  }
  code {
    background: #f5f5f5;
    padding: 2px 5px;
    border-radius: 3px;
    font-family: "SFMono-Regular", Menlo, monospace;
    font-size: 0.9em;
    color: #c7254e;
  }
  pre {
    background: #f7f6f3;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    font-size: 13px;
    line-height: 1.5;
    border: 1px solid #eee;
  }
  pre code { background: none; color: #333; padding: 0; font-size: inherit; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  th { background: #f5f5f5; font-weight: 600; }
  img { max-width: 100%; margin: 12px 0; border-radius: 4px; }
  hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  a { color: #2eaadc; text-decoration: none; }
  strong { font-weight: 700; }
  .footer {
    margin-top: 60px;
    padding-top: 16px;
    border-top: 1px solid #eee;
    font-size: 11px;
    color: #aaa;
    text-align: center;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="cover">
  <h1>${title}</h1>
  <div class="divider"></div>
  <div class="meta">
    <div>${articlePath}</div>
    <div>${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
</div>
<div class="content">
${body}
</div>
<div class="footer">
  Exported from Nexo Wiki · ${new Date().toISOString().split('T')[0]}
</div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  try {
    const articlePath = request.nextUrl.searchParams.get('path');
    if (!articlePath) {
      return NextResponse.json({ ok: false, error: '缺少 path 参数' }, { status: 400 });
    }

    const filePath = resolveArticlePath(articlePath);
    if (!filePath) {
      return NextResponse.json({ ok: false, error: '文档不存在' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : articlePath.split('/').pop() || 'Untitled';

    const html = generatePrintHtml(title, content, articlePath);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(title)}.html"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `导出失败: ${message}` }, { status: 500 });
  }
}
