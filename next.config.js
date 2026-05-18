/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },


  poweredByHeader: false,
  compress: true,

  // API 请求代理到 Python 后端
  //
  // ⚠️ 关键坑：rewrites 用数组形式 = afterFiles，在 Next.js 动态路由检查**之前**生效。
  // 也就是说 /api/reader/marks/[id]、/api/articles/[id] 这种动态 [id] 路由会被
  // 通配 /api/:path* 直接拦截发给 uvicorn，而 uvicorn 没实现 /api/reader/* 任何东西
  // → marks/notes/thoughts 的 DELETE/PATCH 全部返回 uvicorn 的 404 {"detail":"Not Found"}，
  // 表面 bug：阅读模式画线点完没反应、改不了颜色、删不掉。
  //
  // 修复：改成 { beforeFiles, afterFiles, fallback } 显式形式，把代理放进 fallback。
  // fallback 只在「Next.js 路由（含动态）+ 静态文件都没匹中」时才触发，这样：
  //   - Next.js 已实现的路由（reader/marks/[id] 等）走 Node 实现
  //   - 仅 Python 实现的路由（FastAPI 独有）继续代理过去
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
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
