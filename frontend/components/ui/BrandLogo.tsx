'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export type BrandLogoVariant = 'full' | 'mark' | 'responsive' | 'brand-bar';
export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BrandLogoTheme = 'light' | 'dark' | 'auto';

export interface BrandLogoProps {
  /**
   * Biến thể hiển thị:
   * - 'full': Master 3:1 logo trong suốt không viền (nền sáng: chữ Navy gốc, nền tối: chữ Trắng tinh khôi)
   * - 'mark': 1:1 Biểu tượng chữ O lồng máy bay cánh én vàng (512x512)
   * - 'responsive': Tự động thu gọn thành 'mark' trên mobile (< sm) và 'full' trên tablet/desktop
   * - 'brand-bar': Chuẩn thiết kế Enterprise SaaS cho Sidebar/Topbar (Mark sắc nét + Typography OPTRIP vector + Badge ERP)
   */
  variant?: BrandLogoVariant;

  /**
   * Kích thước chiều cao (chiều rộng tự động tính toán chính xác theo tỷ lệ aspect-ratio để triệt tiêu CLS = 0):
   * - 'xs': h=24px (mark: 24x24, full: 72x24)
   * - 'sm': h=30px (mark: 30x30, full: 90x30)
   * - 'md': h=38px (mark: 38x38, full: 114x38) - Mặc định cho Navigation Header
   * - 'lg': h=48px (mark: 48x48, full: 144x48) - Phù hợp Footer / Drawer
   * - 'xl': h=60px (mark: 60x60, full: 180x60) - Phù hợp Login / Auth Screen
   */
  size?: BrandLogoSize;

  /**
   * Chế độ màu nền:
   * - 'light': Hiển thị trên nền sáng trắng / kem nhạt (dùng logo trong suốt chữ Navy)
   * - 'dark': Hiển thị trực tiếp trên nền tối (dùng logo trong suốt chữ Trắng tinh khôi, hoàn toàn không dán khung trắng)
   * - 'auto': Tự thích ứng với bối cảnh
   */
  theme?: BrandLogoTheme;

  /**
   * Ưu tiên tải hình ảnh (LCP - Largest Contentful Paint).
   * Bật true cho các vị trí Above-the-fold (Header, Hero, Login).
   */
  priority?: boolean;

  /**
   * Cho phép bọc thẻ Link quay về trang chủ ('/')
   * Mặc định là true. Nếu truyền false, sẽ render <div> thuần túy.
   */
  asLink?: boolean;

  /** Đường dẫn khi click (mặc định '/') */
  href?: string;

  /** CSS Class bổ sung cho container ngoài */
  className?: string;

  /** CSS Class bổ sung cho thẻ Image bên trong */
  imageClassName?: string;

  /** Click callback tùy chọn */
  onClick?: (e: React.MouseEvent) => void;
}

interface DimensionSpec {
  width: number;
  height: number;
}

const DIMENSIONS: Record<BrandLogoSize, { full: DimensionSpec; mark: DimensionSpec }> = {
  xs: {
    full: { width: 72, height: 24 },
    mark: { width: 24, height: 24 },
  },
  sm: {
    full: { width: 90, height: 30 },
    mark: { width: 30, height: 30 },
  },
  md: {
    full: { width: 114, height: 38 },
    mark: { width: 38, height: 38 },
  },
  lg: {
    full: { width: 144, height: 48 },
    mark: { width: 48, height: 48 },
  },
  xl: {
    full: { width: 180, height: 60 },
    mark: { width: 60, height: 60 },
  },
};

/**
 * Deep Module: `<BrandLogo />`
 * Chuẩn hóa nhận diện thương hiệu OPTRIP (Travel Operations Platform).
 * 100% Background Transparent (khử toàn bộ khung dán sticker, chữ trắng cho dark mode, chữ navy cho light mode).
 * Khóa chặt tỷ lệ aspect-ratio (3:1 cho logo đầy đủ, 1:1 cho mark) đảm bảo CLS = 0.
 */
export const BrandLogo = React.memo(function BrandLogo({
  variant = 'full',
  size = 'md',
  theme = 'light',
  priority = false,
  asLink = true,
  href = '/',
  className = '',
  imageClassName = '',
  onClick,
}: BrandLogoProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const dim = DIMENSIONS[size] || DIMENSIONS.md;
  const isDark = theme === 'dark';

  // Render phần hình ảnh đơn lẻ (Full hoặc Mark)
  const renderSingleImage = (type: 'full' | 'mark', extraClass = '') => {
    const isMark = type === 'mark';
    const currentDim = isMark ? dim.mark : dim.full;
    
    // Tự động chọn file PNG trong suốt không viền tương ứng theo theme
    const src = isMark
      ? '/brand/optrip-mark.png'
      : (isDark ? '/brand/optrip-logo-dark.png' : '/brand/optrip-logo-transparent.png');
      
    const alt = isMark ? 'OPTRIP App Icon' : 'OPTRIP - Travel Operations Platform';

    if (loadFailed) {
      // Fallback thanh lịch nếu hình ảnh bị chặn hoặc tải lỗi
      return (
        <span
          className={`inline-flex items-center font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'} ${extraClass}`}
          style={{ height: currentDim.height }}
        >
          {isMark ? (
            <span className="w-8 h-8 rounded-full bg-(--color-primary-800) text-(--color-gold) flex items-center justify-center text-xs font-bold shadow-xs">
              O
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-base font-black">
              <span className={isDark ? 'text-white' : 'text-(--color-primary-950)'}>OPTRIP</span>
              <span className="text-[10px] text-(--color-gold) font-bold uppercase tracking-wider">Operations</span>
            </span>
          )}
        </span>
      );
    }

    return (
      <span
        className={`relative inline-block select-none ${isMark ? 'aspect-square' : 'aspect-[3/1]'} ${extraClass}`}
        style={{
          width: currentDim.width,
          height: currentDim.height,
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={currentDim.width}
          height={currentDim.height}
          priority={priority}
          unoptimized
          onError={() => setLoadFailed(true)}
          className={`h-full w-full object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-[1.02] ${imageClassName}`}
        />
      </span>
    );
  };

  // Xử lý nội dung hiển thị theo variant
  let content: React.ReactNode;

  if (variant === 'brand-bar') {
    // Biến thể cao cấp dành riêng cho Sidebar / Topbar Enterprise
    const markHeight = size === 'sm' ? 28 : size === 'lg' ? 38 : 32;
    content = (
      <div className="flex items-center gap-2.5 select-none">
        <span
          className="relative inline-block aspect-square shrink-0 select-none transition-transform duration-300 group-hover:scale-105"
          style={{ width: markHeight, height: markHeight }}
        >
          <Image
            src="/brand/optrip-mark.png"
            alt="OPTRIP"
            width={markHeight}
            height={markHeight}
            priority={priority}
            unoptimized
            className={`h-full w-full object-contain ${imageClassName}`}
          />
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`font-black tracking-tight text-[17px] leading-none font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
            OPTRIP
          </span>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 tracking-wider">
            ERP
          </span>
        </div>
      </div>
    );
  } else if (variant === 'responsive') {
    content = (
      <>
        {/* Mobile: Chỉ hiển thị Mark */}
        {renderSingleImage('mark', 'block sm:hidden')}
        {/* Tablet / Desktop: Hiển thị Logo Master 3:1 đầy đủ */}
        {renderSingleImage('full', 'hidden sm:block')}
      </>
    );
  } else if (variant === 'mark') {
    content = renderSingleImage('mark');
  } else {
    content = renderSingleImage('full');
  }

  const containerClasses = `inline-flex items-center ${className}`.trim();

  if (asLink) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label="OPTRIP - Nền tảng quản trị và điều hành tour lữ hành"
        className={`group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--color-primary-700)] focus-visible:ring-offset-2 rounded-xl transition-opacity duration-200 hover:opacity-95 ${containerClasses}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      className={containerClasses}
    >
      {content}
    </div>
  );
});
