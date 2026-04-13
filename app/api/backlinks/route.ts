import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

interface Backlink {
  path: string;
  title: string;
}

async function walkAndFindLinks(
  dirPath: string,
  relativePath: string,
  targetPath: string,
  results: Backlink[],
): Promise<void> {
  let entries;
  try { entries = await fs.readdir(dirPath, { withFileTypes: true }); } catch { return; }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await walkAndFindLinks(fullPath, relPath, targetPath, results);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const displayPath = relPath.replace(/\.md$/, '').replace(/\/_index$/, '');

        // 跳过自身
        if (displayPath === targetPath) continue;

        // 检查 PageLink 引用（JSON 格式）
        const hasPageLink = content.includes(`"pagePath":"${targetPath}"`) ||
                           content.includes(`"pagePath": "${targetPath}"`);

        // 检查 markdown 链接
        const hasMarkdownLink = content.includes(`](${targetPath})`) ||
                               content.includes(`](/${targetPath})`);

        if (hasPageLink || hasMarkdownLink) {
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : displayPath.split('/').pop() || '';
          results.push({ path: displayPath, title });
        }
      } catch { /* skip */ }
    }
  }
}

export async function GET(req: NextRequest) {
  const articlePath = req.nextUrl.searchParams.get('path') ?? '';

  if (!articlePath) {
    return NextResponse.json({ ok: false, error: 'Missing path' }, { status: 400 });
  }

  try {
    const results: Backlink[] = [];
    await walkAndFindLinks(WIKI_DATA_DIR, '', articlePath, results);
    return NextResponse.json({ ok: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to find backlinks';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
