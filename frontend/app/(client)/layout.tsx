import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OPTRIP - Nền Tảng Vận Hành & Quản Trị Tour Lữ Hành Toàn Diện',
  description:
    'One Platform. Every Trip. Nền tảng ERP/CRM quản trị điều hành tour, tự động bóc tách dự toán Excel, kiểm soát lợi nhuận gộp và quản lý chuỗi phê duyệt trạng thái khép kín cho doanh nghiệp du lịch.',
  keywords: [
    'OPTRIP',
    'OPTRIP Platform',
    'ERP Du Lịch',
    'Quản lý tour',
    'Dự toán tour Excel',
    'Phần mềm lữ hành',
    'CRM du lịch',
  ],
  icons: {
    icon: '/brand/optrip-mark.png',
    apple: '/brand/optrip-mark.png',
  },
  openGraph: {
    title: 'OPTRIP - Nền Tảng Vận Hành & Quản Trị Tour Lữ Hành Toàn Diện',
    description:
      'One Platform. Every Trip. Hệ điều hành tour lữ hành tự chủ: Tự động bóc tách dự toán Excel, kiểm soát biên lợi nhuận, phê duyệt đa cấp và quản trị nhà cung cấp.',
    type: 'website',
    locale: 'vi_VN',
  },
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-(--color-surface) text-(--color-text) flex flex-col selection:bg-(--color-primary-soft) selection:text-(--color-primary-900)">
      {children}
    </div>
  );
}
