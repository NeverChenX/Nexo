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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const targetFolder = (formData.get('targetFolder') as string) || '';
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: 'No files provided' }, { status: 400 });
    }

    const results: { name: string; path: string; ok: boolean; error?: string }[] = [];

    for (const file of files) {
      if (!file.name.endsWith('.md')) {
        results.push({ name: file.name, path: '', ok: false, error: 'Not a .md file' });
        continue;
      }

      const content = await file.text();
      const baseName = file.name.replace(/\.md$/, '');

      // 检查名称安全性
      if (/[\/\\]/.test(baseName) || baseName === '..' || baseName === '.') {
        results.push({ name: file.name, path: '', ok: false, error: 'Invalid filename' });
        continue;
      }

      const articlePath = targetFolder ? `${targetFolder}/${baseName}` : baseName;
      const filePath = safePath(articlePath + '.md');

      // 如果文件已存在，添加数字后缀
      let finalPath = filePath;
      let finalArticlePath = articlePath;
      let counter = 1;
      while (true) {
        try {
          await fs.access(finalPath);
          // 文件存在，尝试下一个名字
          finalArticlePath = targetFolder ? `${targetFolder}/${baseName}-${counter}` : `${baseName}-${counter}`;
          finalPath = safePath(finalArticlePath + '.md');
          counter++;
        } catch {
          break; // 文件不存在，可以使用
        }
      }

      try {
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.writeFile(finalPath, content, 'utf-8');
        results.push({ name: file.name, path: finalArticlePath, ok: true });
      } catch (err) {
        results.push({ name: file.name, path: '', ok: false, error: err instanceof Error ? err.message : 'Write failed' });
      }
    }

    return NextResponse.json({ ok: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
