import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readerDataDir, ensureReaderDataDir } from '@/lib/reader/server-store';

export async function GET() {
  await ensureReaderDataDir();
  const dir = readerDataDir();
  const zip = new AdmZip();
  const files = [
    'marks.json',
    'notes.json',
    'thoughts.json',
    'favorites.json',
    'history.json',
    'stats.json',
  ];
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const buf = await fs.readFile(full);
      zip.addFile(f, buf);
    } catch {
      zip.addFile(f, Buffer.from(f === 'stats.json' ? '{}' : '[]'));
    }
  }
  const out = zip.toBuffer();
  return new NextResponse(out, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="reader-export-${Date.now()}.zip"`,
    },
  });
}
