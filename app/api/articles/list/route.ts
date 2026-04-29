import { NextResponse } from 'next/server';
import { listAllArticles } from '@/lib/storage';

export async function GET() {
  try {
    const all = await listAllArticles();
    return NextResponse.json({ ok: true, data: all });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
