import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_HOST_MARKERS = ['tail2ce346.ts.net', ':8443'];

function isPublicReaderHost(req: NextRequest): boolean {
  const host = req.headers.get('host') ?? '';
  const xfh = req.headers.get('x-forwarded-host') ?? '';
  const candidate = `${host} ${xfh}`.toLowerCase();
  return PUBLIC_HOST_MARKERS.some((m) => candidate.includes(m));
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== '/') return NextResponse.next();
  if (!isPublicReaderHost(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/read';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/'],
};
