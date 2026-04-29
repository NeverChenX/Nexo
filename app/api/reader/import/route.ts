import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readerDataDir, ensureReaderDataDir } from '@/lib/reader/server-store';

export async function POST(req: NextRequest) {
  await ensureReaderDataDir();
  const buf = Buffer.from(await req.arrayBuffer());
  const zip = new AdmZip(buf);
  const counts: Record<string, number> = {};
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.endsWith('.json')) continue;
    const dest = path.join(readerDataDir(), path.basename(entry.entryName));
    const text = entry.getData().toString('utf8');
    try {
      const parsed = JSON.parse(text);
      counts[entry.entryName] = Array.isArray(parsed) ? parsed.length : 1;
      await fs.writeFile(dest, text, 'utf8');
    } catch {
      // skip invalid
    }
  }
  return NextResponse.json({ ok: true, counts });
}
