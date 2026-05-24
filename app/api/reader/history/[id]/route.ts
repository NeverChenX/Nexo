import { NextRequest, NextResponse } from 'next/server';
import { stores, histKey } from '@/lib/reader/server-factory';

/**
 * H1: dedicated O(1) lookup for a single article's history. The old client
 * path was getHistoryEntry(articleId) → listHistory() → find() which forced
 * the entire history table over the wire on every article open (LCP wreck
 * once readers accumulate hundreds of entries).
 *
 * articleId may include slashes / encoded chars; clients should encode it
 * into the URL path segment. We pass through histKey() so the on-disk key
 * format stays a single source of truth with POST /api/reader/history.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const articleId = decodeURIComponent(params.id);
  if (!articleId) {
    return NextResponse.json(
      { ok: false, error: 'articleId required' },
      { status: 400 },
    );
  }
  const key = histKey(articleId);
  const entry = await stores.history().findById(key);
  return NextResponse.json({ ok: true, data: entry ?? null });
}
