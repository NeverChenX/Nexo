import { NextRequest, NextResponse } from 'next/server';

// Reader 模式已移除（2026-05-31）。原先的"公网只读 + 内网读写"双层防护
// 简化为统一行为：任意 host 进来都直通编辑器视图。
//
// /api/settings 与 /api/ai-* 的写入接口在公网也开放——cloudflared / tailscale
// 域名本身视作私密入口，未在外部公开发布。如果未来出现滥用，应在反向代理层
// 加 IP 白名单 / 鉴权 cookie，而不是在 middleware 内部按 host 分流。

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/editor';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
