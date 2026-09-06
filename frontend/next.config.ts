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
};


// Next.js config with dynamic routes support
export default nextConfig;

