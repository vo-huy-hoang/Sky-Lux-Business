import type { Metadata } from 'next';
import { RootProvider } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sky-Lux CRM - Hệ Thống Quản Lý Tour & Dự Toán Báo Giá',
  description: 'Nền tảng quản lý điều hành tour, dự toán chiết tính và CRM chuyên biệt cho Sky-Lux Travel Corporation',
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
