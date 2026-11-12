'use client';

import React from 'react';
import Link from 'next/link';
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';
import { BrandLogo } from '@/components/ui';

export function ClientFooter() {
  return (
    <footer className="bg-(--color-text) text-white pt-20 pb-12 border-t border-white/10 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 4-Column Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-16 border-b border-white/10">
          {/* Column 1: Brand & Contact Info (Span 4) */}
          <div className="lg:col-span-4 space-y-5">
            {/* OPTRIP Brand Logo with Glass Capsule Protection on Dark Background */}
            <div className="flex items-center gap-3">
              <BrandLogo variant="full" size="lg" theme="dark" />
            </div>

            <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-sm font-medium">
              Nền tảng quản trị toàn diện hoạt động kinh doanh và điều hành du lịch. Tự động bóc tách dự toán, kiểm soát chi phí và lợi nhuận, quản trị toàn diện thông qua Dashboard cho CEO, Điều hành và Sales.
            </p>

            <div className="space-y-2.5 text-xs text-white/70 pt-2 font-medium">
              <div className="flex items-start gap-2.5">
                <EnvironmentOutlined className="text-(--color-primary-600) mt-0.5 shrink-0" />
                <span>Trụ sở chính: Tầng 3, Thành Quân Building, Thanh Khê, Đà Nẵng</span>
              </div>
              <div className="flex items-center gap-2.5">
                <PhoneOutlined className="text-(--color-primary-600) shrink-0" />
                <span>Hotline: 19004343 – Hỗ trợ kỹ thuật: 24/24</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MailOutlined className="text-(--color-primary-600) shrink-0" />
                <span>Email: contact@optrip.vn</span>
              </div>
            </div>
          </div>

          {/* Column 2: Chức Năng Nền Tảng (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-white/90">
              Chức Năng Chính
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60 font-medium">
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Import và bóc tách dự toán Sales
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Phê duyệt online
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Thống kê chi phí – Doanh thu – Lợi nhuận – Khách hàng
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Thiết lập và mã hóa nhà cung cấp – Khách hàng
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Quản trị mọi thông số qua Dashboard
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Chăm sóc khách hàng
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors duration-200">
                  Trao đổi và SSE theo thời gian thực
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Giải Pháp Theo Vai Trò (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-white/90">
              Giải Pháp Theo Vai Trò
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60 font-medium">
              <li>
                <a href="#workflow" className="hover:text-white transition-colors duration-200">
                  Ban Giám Đốc (CEO / BOD Oversight)
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors duration-200">
                  Bộ Phận Điều Hành (Operator Command)
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors duration-200">
                  Chuyên Viên Kinh Doanh (Sales Streamlined)
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors duration-200">
                  Kế Toán Doanh Nghiệp (Financial Settlement)
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-white transition-colors duration-200">
                  Quản Trị Mạng Lưới Nhà Cung Cấp
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-white transition-colors duration-200">
                  Báo Cáo Phân Tích & KPI Tự Động
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: An Toàn & Bảo Mật (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-white/90">
              Cam Kết Hệ Thống
            </h4>
            <div className="space-y-3 text-xs text-white/70">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-(--color-success)">
                  <SafetyCertificateOutlined />
                  <span>100% Tự Chủ</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed font-normal">
                  Toàn bộ dữ liệu nằm trên hạ tầng riêng của doanh nghiệp.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-(--color-gold)">
                  <span>0 VNĐ Phí API</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed font-normal">
                  Không phụ thuộc vào các dịch vụ tính phí duy trì bên ngoài.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Security Links */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50 font-medium">
          <div>
            © {new Date().getFullYear()} OPTRIP Platform. Nền Tảng Quản Trị & Điều Hành Tour Lữ Hành Chuyên Biệt.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors duration-200">
              Đăng nhập nội bộ
            </Link>
            <a href="#trust" className="hover:text-white transition-colors duration-200">
              Chính sách bảo mật
            </a>
            <a href="#workflow" className="hover:text-white transition-colors duration-200">
              Quy chuẩn dữ liệu
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
