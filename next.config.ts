import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保正确处理静态文件
  trailingSlash: false,

  // 处理构建错误
  typescript: {
    // 在生产构建时检查 TypeScript 错误
    ignoreBuildErrors: false,
  },

  eslint: {
    // 在构建时检查 ESLint 错误
    ignoreDuringBuilds: false,
  },

  // 服务器外部包配置（Next.js 15的新配置方式）
  serverExternalPackages: [],

  // 配置允许的开发环境跨域来源
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "0.0.0.0",
  ],

  // 开发环境配置
  async headers() {
    return [
      {
        // 匹配所有API路由
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // 在生产环境中应该设置为具体的域名
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
