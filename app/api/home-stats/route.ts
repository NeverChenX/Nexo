import { NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/wiki-cache';

export async function GET() {
  try {
    const docs = await getAllDocs();

    let totalWords = 0;
    const tagSet = new Set<string>();
    const folderSet = new Set<string>();

    for (const doc of docs) {
      totalWords += doc.wordCount;
      for (const tag of doc.tags) tagSet.add(tag);
      // 统计文件夹数（按路径前缀去重）
      const parts = doc.path.split('/');
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          folderSet.add(parts.slice(0, i).join('/'));
        }
      }
    }

    // 按修改时间排序，取最近 10 条
    const sorted = [...docs].sort((a, b) => b.mtime - a.mtime);
    const recentlyUpdated = sorted.slice(0, 10).map((d) => ({
      path: d.path,
      title: d.title,
      wordCount: d.wordCount,
      updatedAt: new Date(d.mtime).toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        totalDocs: docs.length,
        totalWords,
        totalTags: tagSet.size,
        totalFolders: folderSet.size,
        recentlyUpdated,
        // 用于首页清理 localStorage 里指向已删除文档的 recent/favorites
        allPaths: docs.map((d) => d.path),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
