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

// 把文本按 Markdown H1/H2 自动分章节（仅 PDF/DOCX 用得上）
function splitByHeadings(md: string): { title: string; body: string }[] {
  const lines = md.split('\n');
  const chapters: { title: string; body: string }[] = [];
  let current: { title: string; body: string } | null = null;
  for (const line of lines) {
    const h = line.match(/^#{1,2}\s+(.+)$/);
    if (h) {
      if (current) chapters.push(current);
      current = { title: h[1].trim(), body: '' };
    } else if (current) {
      current.body += line + '\n';
    } else {
      // 起始散落内容放一个"引言"章
      current = { title: '引言', body: line + '\n' };
    }
  }
  if (current) chapters.push(current);
  return chapters;
}

async function pdfToMarkdown(buf: Buffer): Promise<string> {
  const mod: any = await import('pdf-parse');
  const pdfParse = mod.default ?? mod;
  const { text } = await pdfParse(buf);
  // 粗转 Markdown：按双换行分段；过短行猜作标题
  return (text as string)
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((para: string) => {
      const t = para.trim();
      if (!t) return '';
      if (t.length < 60 && /^([0-9]+[.、]\s|[\u4e00-\u9fa5]{2,10}$|[A-Z][A-Z\s]{2,})/.test(t)) {
        return `## ${t}`;
      }
      return t;
    })
    .filter(Boolean)
    .join('\n\n');
}

async function docxToMarkdown(buf: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await (mammoth as any).convertToMarkdown({ buffer: buf });
  return typeof value === 'string' ? value : '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const targetFolder = (formData.get('targetFolder') as string) || '';
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: 'No files provided' }, { status: 400 });
    }

    const results: { name: string; path: string; ok: boolean; error?: string; chapters?: number }[] = [];

    for (const file of files) {
      const lower = file.name.toLowerCase();
      const baseName = file.name.replace(/\.(md|pdf|docx?)$/i, '');
      if (/[\/\\]/.test(baseName) || baseName === '..' || baseName === '.') {
        results.push({ name: file.name, path: '', ok: false, error: 'Invalid filename' });
        continue;
      }

      let content: string;
      let isBook = false;
      try {
        if (lower.endsWith('.md')) {
          content = await file.text();
        } else if (lower.endsWith('.pdf')) {
          const ab = await file.arrayBuffer();
          content = await pdfToMarkdown(Buffer.from(ab));
          isBook = true;
        } else if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
          const ab = await file.arrayBuffer();
          content = await docxToMarkdown(Buffer.from(ab));
          isBook = true;
        } else {
          results.push({ name: file.name, path: '', ok: false, error: '不支持的格式（仅支持 .md / .pdf / .docx）' });
          continue;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '抽取失败';
        results.push({ name: file.name, path: '', ok: false, error: `文件抽取失败: ${msg}` });
        continue;
      }

      // 大文件（PDF/DOCX）按章节切；否则整体一份
      const approxChars = content.length;
      if (isBook && approxChars > 8000) {
        // 建父页面 + 子章节
        const bookFolder = targetFolder ? `${targetFolder}/${baseName}` : baseName;
        const indexPath = safePath(path.join(bookFolder, '_index.md'));
        const chapters = splitByHeadings(content);
        try {
          await fs.mkdir(path.dirname(indexPath), { recursive: true });
          await fs.writeFile(indexPath, `# ${baseName}\n\n导入自 ${file.name}，共 ${chapters.length} 章。\n`, 'utf-8');
          let i = 0;
          for (const ch of chapters) {
            i++;
            const chName = `${String(i).padStart(2, '0')}-${ch.title.slice(0, 40).replace(/[\\/]/g, '_')}`;
            const chFile = safePath(path.join(bookFolder, `${chName}.md`));
            await fs.writeFile(chFile, `# ${ch.title}\n\n${ch.body.trim()}\n`, 'utf-8');
          }
          results.push({ name: file.name, path: bookFolder, ok: true, chapters: chapters.length });
        } catch (e) {
          results.push({ name: file.name, path: '', ok: false, error: e instanceof Error ? e.message : '写入失败' });
        }
      } else {
        // 作为单个文档写入
        const articlePath = targetFolder ? `${targetFolder}/${baseName}` : baseName;
        let finalArticlePath = articlePath;
        let finalPath = safePath(finalArticlePath + '.md');
        let counter = 1;
        while (true) {
          try {
            await fs.access(finalPath);
            finalArticlePath = targetFolder ? `${targetFolder}/${baseName}-${counter}` : `${baseName}-${counter}`;
            finalPath = safePath(finalArticlePath + '.md');
            counter++;
          } catch { break; }
        }
        try {
          await fs.mkdir(path.dirname(finalPath), { recursive: true });
          const prefix = isBook ? `# ${baseName}\n\n导入自 ${file.name}\n\n` : '';
          await fs.writeFile(finalPath, prefix + content, 'utf-8');
          results.push({ name: file.name, path: finalArticlePath, ok: true });
        } catch (err) {
          results.push({ name: file.name, path: '', ok: false, error: err instanceof Error ? err.message : 'Write failed' });
        }
      }
    }

    return NextResponse.json({ ok: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
