import type { Metadata } from 'next';
import { RootProvider } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'OPTRIP - Nền Tảng Quản Trị & Điều Hành Tour Lữ Hành',
  description: 'One Platform. Every Trip. Nền tảng quản lý điều hành tour, dự toán chiết tính và tự động hóa vận hành du lịch toàn diện.',
  icons: {
    icon: '/brand/optrip-mark.png',
    apple: '/brand/optrip-mark.png',
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
