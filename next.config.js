/** @type {import('next').NextConfig} */

// C5: baseline security headers. CSP is intentionally permissive enough for
// Mermaid (which inlines SVG) and KaTeX (which inlines style); tighten over
// time. Without CSP a future markdown-render escape == site takeover, so
// we want *some* second layer of defense even if the sanitizer holds.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP: prehydration script is a literal in app/layout.tsx and is allowed
  // through 'unsafe-inline' on script-src; tighten to a nonce later if you
  // refactor that script. style-src includes 'unsafe-inline' for KaTeX.
  // object-src 'none' kills <object>/<embed>; base-uri 'self' blocks
  // <base> hijacks.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },


  poweredByHeader: false,
  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },

  // API 请求代理到 Python 后端
  //
  // ⚠️ 关键坑：rewrites 用数组形式 = afterFiles，在 Next.js 动态路由检查**之前**生效。
  // 也就是说 /api/reader/marks/[id]、/api/articles/[id] 这种动态 [id] 路由会被
  // 通配 /api/:path* 直接拦截发给 uvicorn，而 uvicorn 没实现 /api/reader/* 任何东西
  // → marks/notes/thoughts 的 DELETE/PATCH 全部返回 uvicorn 的 404 {"detail":"Not Found"}，
  // 表面 bug：阅读模式画线点完没反应、改不了颜色、删不掉。
  //
  // H10 update: scoped catch-all to `/api/legacy/:path*` so a future Next.js
  // route added under /api/ never silently gets traffic shadow-routed to
  // uvicorn. Anything that genuinely lives only in Python should be addressed
  // via `/api/legacy/...` going forward. Existing /api/* Next routes
  // (reader/*, articles/*, settings/*, ai-*) continue served by Next and
  // never reach the fallback because the fallback shape is now scoped.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/legacy/:path*',
          destination: 'http://127.0.0.1:8000/api/:path*',
        },
        {
          source: '/uploads/:path*',
          destination: 'http://127.0.0.1:8000/uploads/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
