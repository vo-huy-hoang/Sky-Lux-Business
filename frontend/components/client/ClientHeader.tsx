'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Dropdown, MenuProps } from 'antd';
import {
  DownOutlined,
  MenuOutlined,
  CloseOutlined,
  FolderOpenOutlined,
  DollarOutlined,
  FileExcelOutlined,
  ShopOutlined,
  MessageOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';
import { BrandLogo } from '@/components/ui';

export function ClientHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll handler with header offset calculation
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Dropdown Sản Phẩm (Chức năng chính hệ thống)
  const productMenuItems: MenuProps['items'] = [
    {
      key: 'dossiers',
      icon: <FolderOpenOutlined style={{ color: themeTokens.brand.primary[700] }} />,
      label: (
        <a href="#features" onClick={(e) => handleScrollTo(e, 'features')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">Quản Lý Hồ Sơ Tour</div>
          <div className="text-xs text-(--color-text-muted)">Theo dõi toàn bộ vòng đời hồ sơ đoàn từ báo giá đến khi kết thúc tour</div>
        </a>
      ),
    },
    {
      key: 'estimates',
      icon: <DollarOutlined style={{ color: themeTokens.brand.gold.main }} />,
      label: (
        <a href="#features" onClick={(e) => handleScrollTo(e, 'features')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">Dự Toán Chi Phí & Doanh Thu</div>
          <div className="text-xs text-(--color-text-muted)">Tính toán đa phiên bản, tự động bóc tách Revenue Lines và Cost Lines</div>
        </a>
      ),
    },
    {
      key: 'excel-import',
      icon: <FileExcelOutlined style={{ color: themeTokens.semantic.success.main }} />,
      label: (
        <a href="#features" onClick={(e) => handleScrollTo(e, 'features')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">Import Bảng Dự Toán Excel</div>
          <div className="text-xs text-(--color-text-muted)">Hàng đợi BullMQ xử lý ngầm, khử độc công thức CSV an toàn</div>
        </a>
      ),
    },
    {
      key: 'crm-suppliers',
      icon: <ShopOutlined style={{ color: themeTokens.semantic.info.main }} />,
      label: (
        <a href="#features" onClick={(e) => handleScrollTo(e, 'features')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">CRM Khách Hàng & Nhà Cung Cấp</div>
          <div className="text-xs text-(--color-text-muted)">Danh bạ khách hàng B2B/B2C, quản lý đối tác khách sạn, xe và vé tour</div>
        </a>
      ),
    },
    {
      key: 'realtime-chat',
      icon: <MessageOutlined style={{ color: themeTokens.semantic.purple.main }} />,
      label: (
        <a href="#features" onClick={(e) => handleScrollTo(e, 'features')} className="py-1.5 block">
          <div className="font-semibold text-sm text-(--color-text)">Trò Chuyện & SSE Thời Gian Thực</div>
          <div className="text-xs text-(--color-text-muted)">Thông báo in-app và chat nội bộ theo từng tour, không tốn phí bên thứ 3</div>
        </a>
      ),
    },
  ];

  // Dropdown Giải Pháp Theo Vai Trò
  const solutionMenuItems: MenuProps['items'] = [
    {
      key: 'ceo',
      icon: <AuditOutlined style={{ color: themeTokens.brand.gold.main }} />,
      label: (
        <a href="#solutions" onClick={(e) => handleScrollTo(e, 'solutions')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">Cho Ban Giám Đốc (CEO / BOD)</div>
          <div className="text-xs text-(--color-text-muted)">Kiểm soát biên lợi nhuận gộp, phê duyệt giá thương mại và báo cáo KPI</div>
        </a>
      ),
    },
    {
      key: 'operator',
      icon: <CheckCircleOutlined style={{ color: themeTokens.brand.primary[700] }} />,
      label: (
        <a href="#solutions" onClick={(e) => handleScrollTo(e, 'solutions')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">Cho Bộ Phận Điều Hành (Operator)</div>
          <div className="text-xs text-(--color-text-muted)">Khảo sát giá Net nhà cung cấp, quản lý checklist công việc và lịch tour</div>
        </a>
      ),
    },
    {
      key: 'sales',
      icon: <TeamOutlined style={{ color: themeTokens.semantic.info.main }} />,
      label: (
        <a href="#solutions" onClick={(e) => handleScrollTo(e, 'solutions')} className="py-1.5 block">
          <div className="font-bold text-sm text-(--color-text)">Cho Chuyên Viên Kinh Doanh (Sales)</div>
          <div className="text-xs text-(--color-text-muted)">Tải bảng tính Excel lên trong 2 giây, nộp duyệt báo giá nhanh và chốt hợp đồng</div>
        </a>
      ),
    },
  ];

  return (
    <header className="sticky top-3 sm:top-5 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6">
      {/* Outer Doppelrand / Double-Bezel Shell */}
      <div className="p-1 rounded-full bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {/* Inner Core Island */}
        <div className="bg-white/95 backdrop-blur-xl rounded-full px-4 sm:px-7 h-14 sm:h-16 flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_10px_35px_-10px_rgba(0,0,0,0.06)]">
          {/* Brand Logo - Responsive: Mobile Mark (1:1) / Desktop Master Logo (3:1) */}
          <BrandLogo variant="responsive" size="md" priority />

          {/* Center Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <Dropdown menu={{ items: productMenuItems }} placement="bottom">
              <button className="flex items-center gap-1.5 hover:text-(--color-primary-900) transition-colors duration-200 cursor-pointer py-1">
                <span>Sản phẩm</span>
                <DownOutlined className="text-[10px] text-slate-400" />
              </button>
            </Dropdown>

            <Dropdown menu={{ items: solutionMenuItems }} placement="bottom">
              <button className="flex items-center gap-1.5 hover:text-(--color-primary-900) transition-colors duration-200 cursor-pointer py-1">
                <span>Giải pháp</span>
                <DownOutlined className="text-[10px] text-slate-400" />
              </button>
            </Dropdown>

            <a
              href="#features"
              onClick={(e) => handleScrollTo(e, 'features')}
              className="text-slate-700 hover:text-(--color-primary-900) transition-colors duration-200 cursor-pointer"
            >
              Chức năng chính
            </a>

            <a
              href="#workflow"
              onClick={(e) => handleScrollTo(e, 'workflow')}
              className="text-slate-700 hover:text-(--color-primary-900) transition-colors duration-200 cursor-pointer"
            >
              Quy trình
            </a>

            <a
              href="#trust"
              onClick={(e) => handleScrollTo(e, 'trust')}
              className="text-slate-700 hover:text-(--color-primary-900) transition-colors duration-200 cursor-pointer"
            >
              Cam kết
            </a>
          </nav>

          {/* Right Action Island: Bỏ Đăng nhập, Giữ lại Đăng Ký Demo */}
          <div className="hidden sm:flex items-center">
            <Link href="/login">
              <button
                className="h-10 sm:h-11 pl-5 pr-2 rounded-full text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-lg hover:shadow-(--color-primary-900)/20 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 group cursor-pointer"
                style={{ backgroundColor: themeTokens.brand.primary[900] }}
              >
                <span>Đăng Ký Demo</span>
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:-translate-y-[0.5px] group-hover:bg-white/30">
                  <ArrowRightOutlined className="text-[10px]" />
                </span>
              </button>
            </Link>
          </div>

          {/* Mobile Hamburger Morph Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-(--color-primary-900) transition-colors cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <CloseOutlined className="text-lg" /> : <MenuOutlined className="text-lg" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 p-1.5 rounded-3xl bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-[calc(1.5rem-0.375rem)] p-6 shadow-2xl space-y-4 text-sm font-semibold text-slate-800">
            <div className="font-extrabold text-xs uppercase tracking-wider text-slate-400 px-2">
              Điều Hướng Hệ Thống
            </div>
            <a
              href="#features"
              onClick={(e) => handleScrollTo(e, 'features')}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:text-(--color-primary-900) hover:bg-slate-50 transition-colors"
            >
              Chức năng chính
            </a>
            <a
              href="#workflow"
              onClick={(e) => handleScrollTo(e, 'workflow')}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:text-(--color-primary-900) hover:bg-slate-50 transition-colors"
            >
              Quy trình 5 giai đoạn
            </a>
            <a
              href="#trust"
              onClick={(e) => handleScrollTo(e, 'trust')}
              className="block px-3 py-2 rounded-xl text-slate-800 hover:text-(--color-primary-900) hover:bg-slate-50 transition-colors"
            >
              Cam kết kiến trúc & bảo mật
            </a>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <button
                  className="w-full py-3 rounded-full text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: themeTokens.brand.primary[900] }}
                >
                  <span>Đăng Ký Trải Nghiệm Demo</span>
                  <ArrowRightOutlined className="text-xs" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
