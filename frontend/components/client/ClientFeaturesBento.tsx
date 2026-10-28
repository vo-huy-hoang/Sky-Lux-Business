'use client';

import React, { useState } from 'react';
import {
  FileExcelOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';

export function ClientFeaturesBento() {
  const [isSimulatingExcel, setIsSimulatingExcel] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(100);

  const handleSimulate = () => {
    setIsSimulatingExcel(true);
    setSimulatedProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setSimulatedProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsSimulatingExcel(false);
      }
    }, 150);
  };

  return (
    <section id="features" className="scroll-mt-24 sm:scroll-mt-28 py-24 md:py-36 bg-slate-50/70 border-t border-slate-100 relative select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="p-1 rounded-full bg-emerald-950/[0.04] ring-1 ring-emerald-900/[0.08] inline-block mb-4 shadow-2xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-(--color-primary-800) text-[11px] font-black uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-primary-600)" />
              CHỨC NĂNG CHÍNH HỆ THỐNG
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-(--color-text) tracking-tight leading-[1.15]">
            4 Trụ Cột Vận Hành <br className="hidden sm:inline" />
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(135deg, ${themeTokens.brand.primary[900]}, ${themeTokens.brand.primary[600]})`,
              }}
            >
              Chuyên Biệt Cho Doanh Nghiệp Lữ Hành
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            Giải quyết triệt để bài toán phân mảnh dữ liệu giữa Sales, Điều Hành và Kế Toán bằng một nền tảng vận hành tự chủ duy nhất.
          </p>
        </div>

        {/* Bento Grid (Double-Bezel Nested Architecture) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Card 1: Excel Ingestion & BullMQ Queue (Span 7) */}
          <div className="lg:col-span-7 p-1.5 sm:p-2 rounded-[2.2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="rounded-[calc(2.2rem-0.5rem)] bg-white p-5 sm:p-7 md:p-9 h-full flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-(--color-success) text-2xl shadow-xs group-hover:scale-105 transition-transform">
                    <FileExcelOutlined />
                  </div>
                  <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-slate-100 text-(--color-primary-800)">
                    SheetJS + BullMQ Queue
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-(--color-text) mb-3 group-hover:text-(--color-primary-700) transition-colors">
                  Bóc Tách Dự Toán Excel Tự Động & An Toàn
                </h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-6 font-medium">
                  Chuyên viên chỉ cần tải lên bảng tính Excel quen thuộc. Hàng đợi BullMQ xử lý ngầm trong 1.2 giây, tự động bóc tách doanh thu và chi phí vào bảng đệm trung gian để kiểm tra trước khi lưu chính thức.
                </p>

                {/* Interactive Simulation Frame */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pb-2 border-b border-slate-200/70 gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="break-all sm:break-normal">1908_DU_TOAN_TOUR_TOKYO_2026.xlsx</span>
                    </div>
                    <button
                      onClick={handleSimulate}
                      disabled={isSimulatingExcel}
                      className="text-[11px] font-bold text-(--color-primary-700) bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                    >
                      <ReloadOutlined className={isSimulatingExcel ? 'animate-spin' : ''} />
                      <span>{isSimulatingExcel ? `Đang xử lý ${simulatedProgress}%` : 'Thử bóc tách lại'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs flex sm:block items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold block">Tổng dòng chi phí</span>
                      <strong className="text-sm font-black text-slate-800">28 dòng Net</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs flex sm:block items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold block">Doanh thu dự kiến</span>
                      <strong className="text-sm font-black text-(--color-primary-900)">725,000,000 đ</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs flex sm:block items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold block">Lợi nhuận gộp</span>
                      <strong className="text-sm font-black text-(--color-gold)">22.1% (160tr)</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 font-semibold">
                <span>Hỗ trợ tệp 30MB • Khử độc mã công thức CSV</span>
                <a href="#workflow" className="font-bold text-(--color-primary-700) flex items-center gap-1 hover:underline">
                  Xem quy trình <ArrowRightOutlined className="text-[10px]" />
                </a>
              </div>
            </div>
          </div>

          {/* Card 2: 6-Stage Immutable State Lock (Span 5) */}
          <div className="lg:col-span-5 p-1.5 sm:p-2 rounded-[2.2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="rounded-[calc(2.2rem-0.5rem)] bg-white p-5 sm:p-7 md:p-9 h-full flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-(--color-gold) text-2xl shadow-xs group-hover:scale-105 transition-transform">
                    <SafetyCertificateOutlined />
                  </div>
                  <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-slate-100 text-(--color-gold)">
                    Immutable State Lock
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-(--color-text) mb-3 group-hover:text-(--color-primary-700) transition-colors">
                  Cỗ Máy Phê Duyệt Giá & Khóa Sổ Bất Biến
                </h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-6 font-medium">
                  Sau khi Ban Giám Đốc bấm duyệt, hồ sơ chuyển sang <strong className="text-(--color-primary-900)">APPROVED</strong> và dự toán tự động đóng băng. Ngăn chặn tuyệt đối hành vi gian lận hoặc tự ý sửa giá bán.
                </p>

                {/* Animated Stepper Mockup */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4 flex items-center justify-between text-[11px] sm:text-xs font-bold">
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-200 text-slate-600">DRAFT</span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-100 text-amber-800">REVIEW</span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <CheckCircleFilled className="text-xs shrink-0" /> APPROVED
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Lưu vết kiểm toán Audit Trail</span>
                <span className="font-bold text-(--color-primary-700)">Chống sửa số tiền</span>
              </div>
            </div>
          </div>

          {/* Card 3: Supplier CRM & Deposit Alerts (Span 5) */}
          <div className="lg:col-span-5 p-1.5 sm:p-2 rounded-[2.2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="rounded-[calc(2.2rem-0.5rem)] bg-white p-5 sm:p-7 md:p-9 h-full flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-(--color-primary-soft) flex items-center justify-center text-(--color-primary-700) text-2xl shadow-xs group-hover:scale-105 transition-transform">
                    <ShopOutlined />
                  </div>
                  <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-(--color-primary-soft) text-(--color-primary-800)">
                    Supplier CRM
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-(--color-text) mb-3 group-hover:text-(--color-primary-700) transition-colors">
                  Mạng Lưới Đối Tác & Cảnh Báo Hạn Cọc
                </h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-6 font-medium">
                  Quản lý tập trung khách sạn, nhà xe, vé máy bay và hướng dẫn viên. Tự động cảnh báo trước 48h hạn thanh toán cọc đối tác, bảo đảm không bao giờ trễ lịch giữ chỗ.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <span className="font-bold text-slate-800">Tokyo Prince Hotel (35 Twin)</span>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md animate-pulse self-start sm:self-auto">
                      Hạn cọc 24h
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <span className="font-bold text-slate-800">Xe Universe 45 chỗ Đà Nẵng</span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md self-start sm:self-auto">
                      Đã chốt Net
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Quản lý công nợ & phiếu chi</span>
                <span className="font-bold text-(--color-primary-700)">Tích hợp điều hành</span>
              </div>
            </div>
          </div>

          {/* Card 4: Financial Accuracy & Realtime Margin (Span 7) */}
          <div className="lg:col-span-7 p-1.5 sm:p-2 rounded-[2.2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="rounded-[calc(2.2rem-0.5rem)] bg-white p-5 sm:p-7 md:p-9 h-full flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-(--color-primary-700) text-2xl shadow-xs group-hover:scale-105 transition-transform">
                    <DollarOutlined />
                  </div>
                  <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-slate-100 text-(--color-primary-800)">
                    NUMERIC(18,2) Precision
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-(--color-text) mb-3 group-hover:text-(--color-primary-700) transition-colors">
                  Độ Chính Xác Tài Chính & Biên Lợi Nhuận
                </h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-6 font-medium">
                  Tách bạch tuyệt đối giữa dòng doanh thu và chi phí đối tác, hỗ trợ đa ngoại tệ (USD, EUR, JPY) với tỷ giá linh hoạt. Không bao giờ xảy ra lỗi làm tròn số thập phân.
                </p>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2.5 text-xs font-medium">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-slate-700 gap-0.5 sm:gap-0">
                    <span className="text-slate-500">Doanh thu bán tour (Revenue):</span>
                    <span className="font-bold text-(--color-primary-900)">2,450,000,000 đ</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-slate-700 gap-0.5 sm:gap-0">
                    <span className="text-slate-500">Chi phí trực tiếp đối tác (Net Cost):</span>
                    <span className="font-semibold text-slate-600">1,925,000,000 đ</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-slate-200/70 font-bold gap-0.5 sm:gap-0">
                    <span className="text-(--color-primary-700)">Lợi nhuận gộp thực tế:</span>
                    <span className="text-(--color-gold) font-black text-sm">525,000,000 đ (21.4%)</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Đa phiên bản V1, V2, V3</span>
                <span className="font-bold text-(--color-primary-700)">Báo cáo thời gian thực</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
