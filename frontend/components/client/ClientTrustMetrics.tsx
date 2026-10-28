'use client';

import React from 'react';
import {
  SafetyCertificateOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';

export function ClientTrustMetrics() {
  return (
    <section id="trust" className="scroll-mt-24 sm:scroll-mt-28 py-24 md:py-36 bg-slate-50/70 border-t border-slate-100 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="p-1 rounded-full bg-emerald-950/[0.04] ring-1 ring-emerald-900/[0.08] inline-block mb-4 shadow-2xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-(--color-primary-800) text-[11px] font-black uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-primary-600)" />
              CAM KẾT NỀN TẢNG DOANH NGHIỆP
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-(--color-text) tracking-tight leading-[1.15]">
            Kiến Trúc Tự Chủ 100% & <br className="hidden sm:inline" />
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(135deg, ${themeTokens.brand.primary[900]}, ${themeTokens.brand.primary[600]})`,
              }}
            >
              Hiệu Năng Vận Hành Bền Bỉ
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            Được xây dựng trên nền tảng công nghệ độc lập, bảo đảm an toàn dữ liệu khách hàng tuyệt đối và không phát sinh chi phí duy trì hàng tháng.
          </p>
        </div>

        {/* 4 Big Real Architectural Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 lg:gap-8 mb-16">
          <div className="p-1 sm:p-1.5 rounded-[1.6rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="rounded-[calc(1.6rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-4 sm:p-7 lg:p-8 text-center h-full flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-(--color-primary-900) tracking-tight">
                6 Nấc
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-1 sm:mt-2">Duyệt Giá Bất Biến</div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-semibold">Khóa giá chống gian lận</p>
            </div>
          </div>

          <div className="p-1 sm:p-1.5 rounded-[1.6rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="rounded-[calc(1.6rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-4 sm:p-7 lg:p-8 text-center h-full flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-(--color-gold) tracking-tight">
                100%
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-1 sm:mt-2">Tự Chủ Hạ Tầng</div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-semibold">On-Premise / Cloud</p>
            </div>
          </div>

          <div className="p-1 sm:p-1.5 rounded-[1.6rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="rounded-[calc(1.6rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-4 sm:p-7 lg:p-8 text-center h-full flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-(--color-primary-700) tracking-tight">
                0 VNĐ
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-1 sm:mt-2">Phí Bên Thứ Ba</div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-semibold">Tự chủ hoàn toàn</p>
            </div>
          </div>

          <div className="p-1 sm:p-1.5 rounded-[1.6rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="rounded-[calc(1.6rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-4 sm:p-7 lg:p-8 text-center h-full flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-(--color-success) tracking-tight">
                18,2
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-1 sm:mt-2">NUMERIC(18,2)</div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-semibold">Bảo toàn từng xu lẻ</p>
            </div>
          </div>
        </div>

        {/* 3 Pillar Architectural Guarantees with Double-Bezel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="p-1 sm:p-1.5 rounded-[1.8rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="rounded-[calc(1.8rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-5 sm:p-7 lg:p-8 space-y-3 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-(--color-primary-700) flex items-center justify-center text-lg shadow-xs">
                <CloudServerOutlined />
              </div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">Hạ Tầng Tự Chủ Riêng Biệt</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Dữ liệu của công ty lữ hành được lưu trữ hoàn toàn trên máy chủ On-Premise hoặc Cloud riêng. Toàn quyền kiểm soát và sao lưu định kỳ mà không lo rò rỉ dữ liệu khách hàng.
              </p>
            </div>
          </div>

          <div className="p-1 sm:p-1.5 rounded-[1.8rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="rounded-[calc(1.8rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-5 sm:p-7 lg:p-8 space-y-3 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-(--color-gold) flex items-center justify-center text-lg shadow-xs">
                <DatabaseOutlined />
              </div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">Bảo Toàn Số Dư NUMERIC(18,2)</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Toàn bộ số tiền doanh thu, chi phí đối tác và tỷ giá ngoại tệ được xử lý qua kiểu dữ liệu số thực chính xác cao của PostgreSQL, không bao giờ xảy ra lỗi sai lệch do làm tròn.
              </p>
            </div>
          </div>

          <div className="p-1 sm:p-1.5 rounded-[1.8rem] sm:rounded-[2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-2xs hover:shadow-md transition-all duration-300">
            <div className="rounded-[calc(1.8rem-0.25rem)] sm:rounded-[calc(2rem-0.375rem)] bg-white p-5 sm:p-7 lg:p-8 space-y-3 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="w-11 h-11 rounded-2xl bg-(--color-primary-soft) text-(--color-primary-700) flex items-center justify-center text-lg shadow-xs">
                <SafetyCertificateOutlined />
              </div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">Phân Quyền RBAC Nghiêm Ngặt</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Tách biệt phạm vi xem giữa Giám Đốc, Điều Hành và Sales. Sales chỉ nhìn thấy hồ sơ của mình, Điều hành kiểm soát mạng lưới đối tác, Giám đốc nắm trọn bức tranh tài chính.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
