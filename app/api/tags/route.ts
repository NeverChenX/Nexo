import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { parseFrontmatter } from '@/lib/frontmatter';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

interface TagInfo {
  tag: string;
  count: number;
}

interface TaggedArticle {
  path: string;
  title: string;
  tags: string[];
}

async function walkArticles(
  dirPath: string,
  relativePath: string,
  collector: (relPath: string, content: string) => void,
): Promise<void> {
  let entries;
  try { entries = await fs.readdir(dirPath, { withFileTypes: true }); } catch { return; }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await walkArticles(fullPath, relPath, collector);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        collector(relPath, content);
      } catch { /* skip */ }
    }
  }
}

// GET: 获取所有标签（或按标签查询文章）
export async function GET(req: NextRequest) {
  const filterTag = req.nextUrl.searchParams.get('tag');

  try {
    const tagCounts = new Map<string, number>();
    const articles: TaggedArticle[] = [];

    await walkArticles(WIKI_DATA_DIR, '', (relPath, content) => {
      const { frontmatter } = parseFrontmatter(content);
      const tags = frontmatter.tags || [];

      if (tags.length === 0) return;

      const displayPath = relPath.replace(/\.md$/, '').replace(/\/_index$/, '');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : displayPath.split('/').pop() || '';

      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }

      if (filterTag && tags.includes(filterTag)) {
        articles.push({ path: displayPath, title, tags });
      }
    });

    if (filterTag) {
      return NextResponse.json({ ok: true, data: { tag: filterTag, articles } });
    }

    const tagList: TagInfo[] = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ ok: true, data: tagList });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list tags';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
