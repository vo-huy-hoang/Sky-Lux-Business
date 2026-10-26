import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: [
      'antd',
      '@ant-design/icons',
      '@ant-design/icons-svg',
      'dayjs',
      'chart.js',
      'react-chartjs-2',
      'lodash',
    ],
  },
  async redirects() {
    return [
      {
        source: '/auth/login',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/main',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/main/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
};

// Next.js config with dynamic routes support
export default nextConfig;

