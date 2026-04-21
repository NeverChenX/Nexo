/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },


  poweredByHeader: false,
  compress: true,

  // API 请求代理到 Python 后端
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:8000/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
