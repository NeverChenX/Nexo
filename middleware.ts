import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_HOST_MARKERS = ['tail2ce346.ts.net', ':8443'];

function isPublicReaderHost(req: NextRequest): boolean {
  const host = req.headers.get('host') ?? '';
  const xfh = req.headers.get('x-forwarded-host') ?? '';
  const candidate = `${host} ${xfh}`.toLowerCase();
  return PUBLIC_HOST_MARKERS.some((m) => candidate.includes(m));
}

// C1 + C3: when reached via a public host (cloudflared / :8443), only the
// read surface is allowed. Block:
//   - any write (POST/PUT/PATCH/DELETE) to /api/*
//   - the entire /editor surface
//   - settings endpoints (avoid leaking ARK key surface even with C2 mask)
// /api/share/* is the documented public surface and stays accessible.
const PUBLIC_READ_API_PREFIXES = ['/api/share/'];
const PUBLIC_BLOCKED_PREFIXES = ['/editor', '/api/settings', '/api/ai-'];

export function middleware(req: NextRequest) {
  const publicHost = isPublicReaderHost(req);

  if (req.nextUrl.pathname === '/') {
    if (!publicHost) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/read';
    return NextResponse.redirect(url);
  }

  if (!publicHost) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // /editor and writable settings/ai endpoints are not exposed publicly
  if (PUBLIC_BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p))) {
    return new NextResponse('not found', { status: 404 });
  }

  // Writes to /api/* are blocked except for explicit public read endpoints
  if (pathname.startsWith('/api/')) {
    const allowedPublic = PUBLIC_READ_API_PREFIXES.some((p) => pathname.startsWith(p));
    const method = req.method.toUpperCase();
    const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (isWrite && !allowedPublic) {
      return new NextResponse(JSON.stringify({ error: 'read-only on public host' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return NextResponse.next();
}

// C3: expanded matcher so /editor and /api/* writes go through the guard above.
export const config = {
  matcher: [
    '/',
    '/editor/:path*',
    '/api/:path*',
  ],
};
