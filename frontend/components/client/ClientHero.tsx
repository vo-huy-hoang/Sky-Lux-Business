'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightOutlined, ThunderboltOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';
import { InteractiveAppPreview } from './InteractiveAppPreview';

export function ClientHero() {
  const handleScrollToWorkflow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('workflow');
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

  return (
    <section className="relative pt-10 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-white select-none">
      {/* Background Subtle Mesh Dots */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none -z-20" />

      {/* Dynamic Ambient Glow Orbs */}
      <div className="absolute top-10 right-10 w-[550px] h-[550px] bg-gradient-to-br from-emerald-100/60 via-teal-100/40 to-sky-100/30 rounded-full blur-3xl pointer-events-none -z-10 animate-orb-breathe" />
      <div className="absolute top-1/2 -left-20 w-96 h-96 bg-gradient-to-tr from-amber-100/40 via-emerald-50/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 2-Column Balanced Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Eyebrow, Title & CTAs (Span 5.5) */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            {/* Eyebrow Micro-Tag with Double Bezel */}
            <div className="p-1 rounded-full bg-emerald-950/[0.04] ring-1 ring-emerald-900/[0.08] mb-6 shadow-2xs">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50/90 text-(--color-primary-800) text-[11px] font-black uppercase tracking-[0.16em]">
                <span className="w-2 h-2 rounded-full bg-(--color-primary-600) animate-pulse" />
                OPTRIP • TRAVEL OPERATIONS PLATFORM
              </div>
            </div>

            {/* Giant Title (No orphan words, perfect semantic lines) */}
            <h1 className="text-2xl sm:text-4xl lg:text-[45px] font-black text-(--color-text) leading-[1.2] sm:leading-[1.18] tracking-tight mb-6">
              Nền tảng quản trị <br className="hidden sm:inline" />
              & điều hành tour <br className="hidden sm:inline" />
              <span
                className="bg-clip-text text-transparent bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${themeTokens.brand.primary[900]} 0%, ${themeTokens.brand.primary[600]} 100%)`,
                }}
              >
                CHUYÊN BIỆT CHO LỮ HÀNH
              </span>
            </h1>

            {/* Subtitle Grounded in Real Travel Operations */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl mb-8 font-medium">
              Tự động bóc tách dự toán Excel trong 1.2 giây, kiểm soát biên lợi nhuận gộp từng đoàn tour và đóng băng giá bán thương mại bất biến cho doanh nghiệp lữ hành.
            </p>

            {/* Nested CTA Buttons (Button-in-Button) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto mb-10">
              <Link href="/login" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto h-12 sm:h-13 pl-7 pr-2.5 rounded-full text-white font-extrabold text-sm sm:text-base shadow-lg shadow-(--color-primary-900)/20 hover:shadow-xl hover:shadow-(--color-primary-900)/30 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between sm:justify-start gap-3.5 group cursor-pointer"
                  style={{ backgroundColor: themeTokens.brand.primary[900] }}
                >
                  <span>Đăng ký Demo</span>
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:-translate-y-[0.5px] group-hover:bg-white/30 group-hover:scale-105">
                    <ArrowRightOutlined className="text-xs" />
                  </span>
                </button>
              </Link>

              <a href="#workflow" onClick={handleScrollToWorkflow} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto h-12 sm:h-13 pl-6 pr-2.5 rounded-full font-bold text-sm sm:text-base text-slate-800 border border-slate-300/90 hover:border-(--color-primary-700) hover:text-(--color-primary-700) bg-white shadow-2xs hover:shadow-sm active:scale-[0.98] transition-all duration-300 flex items-center justify-between sm:justify-start gap-3 group cursor-pointer">
                  <span>Xem quy trình</span>
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-emerald-50">
                    <span className="text-xs">↗</span>
                  </span>
                </button>
              </a>
            </div>

            {/* 3 Real Operations Highlights (Triệt tiêu khoảng trống mênh mông dưới chân Hero, responsive stack) */}
            <div className="w-full pt-6 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-3 text-left">
              <div className="space-y-0.5 p-2 sm:p-0 rounded-xl sm:rounded-none bg-slate-50/60 sm:bg-transparent">
                <div className="flex items-center gap-1.5 text-xs font-black text-(--color-primary-900)">
                  <ThunderboltOutlined className="text-emerald-600" />
                  <span>1.2s Bóc Tách</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Hàng đợi ngầm BullMQ</div>
              </div>

              <div className="space-y-0.5 p-2 sm:p-0 rounded-xl sm:rounded-none bg-slate-50/60 sm:bg-transparent">
                <div className="flex items-center gap-1.5 text-xs font-black text-(--color-gold)">
                  <LockOutlined className="text-amber-500" />
                  <span>6 Nấc Duyệt</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Đóng băng giá bất biến</div>
              </div>

              <div className="space-y-0.5 p-2 sm:p-0 rounded-xl sm:rounded-none bg-slate-50/60 sm:bg-transparent">
                <div className="flex items-center gap-1.5 text-xs font-black text-(--color-primary-700)">
                  <DatabaseOutlined className="text-(--color-primary-600)" />
                  <span>NUMERIC(18,2)</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Bảo toàn từng xu lẻ</div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Tour Workspace Preview (Span 6.5) */}
          <div id="solutions" className="lg:col-span-7 w-full scroll-mt-24 sm:scroll-mt-28">
            <InteractiveAppPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
