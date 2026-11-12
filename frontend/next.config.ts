import type { NextConfig } from "next";

function buildApiConnectOrigins(): string {
  const origins = new Set<string>([
    "'self'",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    try {
      origins.add(new URL(apiUrl).origin);
    } catch {
      // Ignore invalid URL in build-time env
    }
  }
  return Array.from(origins).join(" ");
}

export function buildSecurityHeaders() {
  const isProd = process.env.NODE_ENV === "production";
  const connectSources = buildApiConnectOrigins();
  const scriptDirectives = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptDirectives,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: http://localhost:3001 http://127.0.0.1:3001`,
    "font-src 'self' data: https:",
    `connect-src ${connectSources}`,
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];
}

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(),
      },
    ];
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
