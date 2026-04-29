import { NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

export async function GET() {
  const data = await stores.stats().get();
  return NextResponse.json({ ok: true, data });
}
