'use client';

import React, { useState } from 'react';
import { Tag, Tooltip, message, Progress } from 'antd';
import {
  CompassOutlined,
  FileExcelOutlined,
  CheckCircleFilled,
  ThunderboltOutlined,
  UserOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  LockOutlined,
  CheckOutlined,
  ShopOutlined,
  CarOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';

type RoleView = 'ceo' | 'operator' | 'sales';

export function InteractiveAppPreview() {
  const [activeRole, setActiveRole] = useState<RoleView>('ceo');
  const [approvedTourId, setApprovedTourId] = useState<string | null>(null);
  const [salesSubmitted, setSalesSubmitted] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleApprove = (id: string, name: string) => {
    setApprovedTourId(id);
    messageApi.success({
      content: `Ban Giám Đốc đã phê duyệt giá tour ${name} và đóng băng dự toán!`,
      duration: 3,
    });
  };

  const handleSalesSubmit = () => {
    setSalesSubmitted(true);
    messageApi.success({
      content: 'Đã nộp hồ sơ dự toán thành công lên Ban Giám Đốc xét duyệt!',
      duration: 3,
    });
  };

  return (
    <div className="relative group w-full max-w-full">
      {contextHolder}

      {/* Outer Double-Bezel Shell */}
      <div className="p-1.5 sm:p-2.5 rounded-2xl sm:rounded-[2.2rem] bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.08)] sm:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.12)] transition-all duration-500 w-full overflow-hidden">
        {/* Inner Core macOS Frame */}
        <div className="rounded-xl sm:rounded-[calc(2.2rem-0.625rem)] border border-slate-200/90 bg-white overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] w-full">
          {/* 1. MacOS Window Title Bar */}
          <div className="h-12 bg-slate-50/90 border-b border-slate-200/80 px-3 sm:px-5 flex items-center justify-between select-none">
            {/* macOS Traffic Lights */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-400 border border-rose-500/50 inline-block transition-transform hover:scale-110" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 border border-amber-500/50 inline-block transition-transform hover:scale-110" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 border border-emerald-500/50 inline-block transition-transform hover:scale-110" />
            </div>

            {/* Center Role Switcher */}
            <div className="flex items-center bg-slate-200/70 p-0.5 sm:p-1 rounded-full text-[11px] sm:text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveRole('ceo')}
                className={`min-h-[32px] sm:min-h-0 px-2.5 sm:px-3.5 py-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation flex items-center justify-center ${
                  activeRole === 'ceo'
                    ? 'bg-white text-(--color-primary-900) shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="hidden sm:inline">Ban Giám Đốc (CEO)</span>
                <span className="sm:hidden">CEO</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRole('operator')}
                className={`min-h-[32px] sm:min-h-0 px-2.5 sm:px-3.5 py-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation flex items-center justify-center ${
                  activeRole === 'operator'
                    ? 'bg-white text-(--color-primary-900) shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="hidden sm:inline">Bộ Phận Điều Hành</span>
                <span className="sm:hidden">Điều Hành</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRole('sales')}
                className={`min-h-[32px] sm:min-h-0 px-2.5 sm:px-3.5 py-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation flex items-center justify-center ${
                  activeRole === 'sales'
                    ? 'bg-white text-(--color-primary-900) shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="hidden sm:inline">Phòng Kinh Doanh</span>
                <span className="sm:hidden">Kinh Doanh</span>
              </button>
            </div>

            {/* User Profile Info */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="w-6 h-6 rounded-full bg-(--color-primary-soft) text-(--color-primary-900) flex items-center justify-center text-[10px] font-bold">
                <UserOutlined />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">
                {activeRole === 'ceo' ? 'P.M. Hoàng (CEO)' : activeRole === 'operator' ? 'T.H. Nam (Ops)' : 'N.V. Hưng (Sales)'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
          </div>

          {/* 2. Window Content Area */}
          <div className="p-3 sm:p-5 bg-slate-50/50 min-h-[440px] flex flex-col justify-between">
            {/* --- CEO VIEW: APPROVALS & FINANCIAL MARGINS --- */}
            {activeRole === 'ceo' && (
              <div className="space-y-3 sm:space-y-4 animate-fade-in">
                {/* 3 Metric Cards Strip (Adaptive: compact horizontal row on mobile, 3-col on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Doanh thu tháng này</span>
                      <span className="text-[10px] font-bold text-emerald-600 sm:hidden">↑ 14.8% kỳ trước</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-primary-900) tabular-nums tracking-tight">2,450,000,000 đ</div>
                      <span className="text-[10px] font-bold text-emerald-600 hidden sm:inline-block">↑ 14.8% kỳ trước</span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Biên LN gộp bình quân</span>
                      <span className="text-[10px] font-bold text-emerald-600 sm:hidden">Vượt chỉ tiêu &ge; 18%</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-gold) tabular-nums tracking-tight">22.1%</div>
                      <span className="text-[10px] font-bold text-emerald-600 hidden sm:inline-block">Vượt chỉ tiêu &ge; 18%</span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Hồ sơ chờ phê duyệt</span>
                      <span className="text-[10px] font-bold text-slate-400 sm:hidden">Hạn chốt 24h</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-rose-600 tabular-nums tracking-tight">2 hồ sơ đoàn</div>
                      <span className="text-[10px] font-bold text-slate-400 hidden sm:inline-block">Hạn chốt 24h</span>
                    </div>
                  </div>
                </div>

                {/* Tour Approval Cards Container */}
                <div className="space-y-3">
                  {/* Tour 1: Tokyo 6N5D */}
                  <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-(--color-primary-soft) text-(--color-primary-900) text-[11px] font-black shrink-0">
                            OPT-2026-089
                          </span>
                          <span className="font-extrabold text-xs sm:text-sm text-slate-800">
                            Tokyo - Núi Phú Sĩ (6N5Đ)
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-(--color-primary-800) bg-(--color-primary-soft) px-2 py-0.5 rounded-full shrink-0">
                            HAN ✈ NRT
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 sm:mt-0.5">
                          Đoàn 25 khách (VietinBank) • Khởi hành: 15/11/2026 • Sales: Trần Thu Hà
                        </div>
                      </div>

                      <div className="self-start sm:self-auto">
                        <div className="inline-flex items-center px-2 py-0.5 sm:p-0 rounded-lg sm:rounded-none bg-amber-50/80 sm:bg-transparent border border-amber-200/60 sm:border-none text-xs font-black text-(--color-gold) tabular-nums">
                          Biên LN: 22.1% (+160.000.000 đ)
                        </div>
                      </div>
                    </div>

                    {/* Financial 3-Pillar Row (Adaptive: stacked on mobile <440px, 3-col on 440px+ and sm+) */}
                    <div className="grid grid-cols-1 min-[440px]:grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2 text-left sm:text-center text-xs">
                      <div className="p-2.5 min-[440px]:p-2 sm:p-2 rounded-xl bg-slate-50 border border-slate-100 flex min-[440px]:block items-center justify-between">
                        <span className="text-[10px] text-slate-400 block truncate">Doanh thu bán tour</span>
                        <strong className="text-xs font-black text-(--color-primary-900) tabular-nums tracking-tight">725,000,000 đ</strong>
                      </div>
                      <div className="p-2.5 min-[440px]:p-2 sm:p-2 rounded-xl bg-slate-50 border border-slate-100 flex min-[440px]:block items-center justify-between">
                        <span className="text-[10px] text-slate-400 block truncate">Chi phí đối tác Net</span>
                        <strong className="text-xs font-bold text-slate-600 tabular-nums tracking-tight">565,000,000 đ</strong>
                      </div>
                      <div className="p-2.5 min-[440px]:p-2 sm:p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex min-[440px]:block items-center justify-between">
                        <span className="text-[10px] text-emerald-700 block truncate">Lợi nhuận gộp</span>
                        <strong className="text-xs font-black text-emerald-800 tabular-nums tracking-tight">160,000,000 đ</strong>
                      </div>
                    </div>

                    {/* 1-Click Interactive Approval Button */}
                    <div>
                      {approvedTourId === 'OPT-2026-089' ? (
                        <div className="w-full min-h-[44px] py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-2 animate-fade-in text-center px-2 leading-tight">
                          <CheckOutlined className="text-emerald-600 text-sm shrink-0" />
                          <span>ĐÃ DUYỆT GIÁ • DỰ TOÁN ĐÃ ĐÓNG BĂNG BẤT BIẾN</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApprove('OPT-2026-089', 'Tokyo - Núi Phú Sĩ 6N5Đ')}
                          className="w-full min-h-[44px] py-2.5 rounded-xl text-white text-xs font-extrabold hover:shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-2 touch-manipulation px-3 text-center leading-tight"
                          style={{ backgroundColor: themeTokens.brand.primary[900] }}
                        >
                          <LockOutlined className="shrink-0" />
                          <span>Phê Duyệt Giá Bán & Đóng Băng Dự Toán</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tour 2: Da Nang 4N3D */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black shrink-0">
                          OPT-2026-092
                        </span>
                        <span className="font-bold text-xs text-slate-800">
                          Đà Nẵng - Hội An (4N3Đ)
                        </span>
                        <span className="text-[10px] font-bold text-(--color-primary-800) bg-(--color-primary-soft) px-1.5 py-0.2 rounded-full shrink-0">
                          FPT 120 pax
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 sm:mt-0.5">
                        Doanh thu: 480tr • Chi phí: 385tr • Lãi gộp: 95tr (19.8%)
                      </div>
                    </div>

                    <div className="self-end sm:self-auto shrink-0">
                      {approvedTourId === 'OPT-2026-092' ? (
                        <Tag color="success" className="m-0 font-bold">Đã Khóa Giá</Tag>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApprove('OPT-2026-092', 'Đà Nẵng - Hội An 4N3Đ')}
                          className="min-h-[38px] sm:min-h-0 px-4 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-xs touch-manipulation flex items-center justify-center"
                          style={{ backgroundColor: themeTokens.brand.primary[900] }}
                        >
                          Phê Duyệt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- OPERATOR VIEW: SUPPLIERS & NET COSTS --- */}
            {activeRole === 'operator' && (
              <div className="space-y-3 sm:space-y-4 animate-fade-in">
                {/* 3 Operator Metric Cards (Adaptive layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Tour đang chạy</span>
                      <span className="text-[10px] font-bold text-slate-400 sm:hidden">215 khách lữ hành</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-primary-900) tabular-nums tracking-tight">8 đoàn tour</div>
                      <span className="text-[10px] font-bold text-slate-400 hidden sm:inline-block">215 khách lữ hành</span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Đối tác dịch vụ Net</span>
                      <span className="text-[10px] font-bold text-emerald-600 sm:hidden">Hotel, Xe, Airline</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-primary-900) tabular-nums tracking-tight">42 nhà cung cấp</div>
                      <span className="text-[10px] font-bold text-emerald-600 hidden sm:inline-block">Hotel, Xe, Airline</span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Cảnh báo hạn cọc 24h</span>
                      <span className="text-[10px] font-bold text-amber-600 sm:hidden">Tokyo Prince Hotel</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-amber-600 tabular-nums tracking-tight">1 dịch vụ gấp</div>
                      <span className="text-[10px] font-bold text-amber-600 hidden sm:inline-block">Tokyo Prince Hotel</span>
                    </div>
                  </div>
                </div>

                {/* Supplier Network List */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                  <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                    <span>Mạng lưới đối tác cung ứng & Tình trạng thanh toán</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                      Trực tuyến
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold shrink-0">
                          <ShopOutlined />
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">Tokyo Prince Hotel (35 Phòng Twin)</div>
                          <div className="text-[11px] text-slate-400">Hạn thanh toán cọc 30%: 15:00 Hôm nay</div>
                        </div>
                      </div>
                      <div className="self-end sm:self-auto shrink-0">
                        <Tag color="warning" className="m-0 font-bold">Hạn cọc 24h</Tag>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
                          <CarOutlined />
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">Nhà xe Hoàng Long 45 chỗ (Đà Nẵng - Hội An)</div>
                          <div className="text-[11px] text-slate-400">Giá Net: 18,500,000 đ (VAT 8%)</div>
                        </div>
                      </div>
                      <div className="self-end sm:self-auto shrink-0">
                        <Tag color="success" className="m-0 font-bold">Đã chốt Net</Tag>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-(--color-primary-soft) text-(--color-primary-700) flex items-center justify-center text-sm font-bold shrink-0">
                          <UserOutlined />
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">Hướng dẫn viên: Nguyễn Tuấn Anh</div>
                          <div className="text-[11px] text-slate-400">Thẻ quốc tế tiếng Nhật • Đoàn Tokyo 6N5Đ</div>
                        </div>
                      </div>
                      <div className="self-end sm:self-auto shrink-0">
                        <Tag color="processing" className="m-0 font-bold">Đã gán đoàn</Tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- SALES VIEW: EXCEL INGESTION & FAST SUBMISSION --- */}
            {activeRole === 'sales' && (
              <div className="space-y-3 sm:space-y-4 animate-fade-in">
                {/* 3 Sales Metric Cards (Adaptive layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Doanh số cá nhân</span>
                      <span className="text-[10px] font-bold text-emerald-600 sm:hidden">Hạng 1 tháng này</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-primary-900) tabular-nums tracking-tight">680,000,000 đ</div>
                      <span className="text-[10px] font-bold text-emerald-600 hidden sm:inline-block">Hạng 1 tháng này</span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Tiến độ đạt KPI</span>
                      <span className="text-[10px] font-bold text-emerald-600 sm:hidden">Vượt chỉ tiêu 13%</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-gold) tabular-nums tracking-tight">113%</div>
                      <span className="text-[10px] font-bold text-emerald-600 hidden sm:inline-block">Vượt chỉ tiêu 13%</span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex sm:flex-col items-center sm:items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block truncate">Hồ sơ tour quản lý</span>
                      <span className="text-[10px] font-bold text-slate-400 sm:hidden">2 hồ sơ đang duyệt</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base font-black text-(--color-primary-900) tabular-nums tracking-tight">4 hồ sơ đoàn</div>
                      <span className="text-[10px] font-bold text-slate-400 hidden sm:inline-block">2 hồ sơ đang duyệt</span>
                    </div>
                  </div>
                </div>

                {/* Excel Ingestion Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-(--color-success) flex items-center justify-center text-lg shrink-0">
                        <FileExcelOutlined />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-800 break-all sm:break-normal">
                          1908_DU_TOAN_TOUR_TOKYO_2026.xlsx
                        </div>
                        <div className="text-[11px] text-slate-400">
                          28 dòng chi phí • Đã khử độc mã CSV • Giá bán đề xuất: 29.000.000 đ/khách
                        </div>
                      </div>
                    </div>
                    <div className="self-end sm:self-auto shrink-0">
                      <Tag color="success" className="m-0 font-bold">Đã Bóc Tách</Tag>
                    </div>
                  </div>

                  {/* Excel Parsed Mini Table (2-col on mobile, 4-col on sm+) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block truncate">Số khách (Pax)</span>
                      <strong className="text-xs font-black text-slate-800 tabular-nums">25 Khách</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block truncate">Tiền khách sạn</span>
                      <strong className="text-xs font-bold text-slate-700 tabular-nums tracking-tight">210,000,000 đ</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block truncate">Vé máy bay</span>
                      <strong className="text-xs font-bold text-slate-700 tabular-nums tracking-tight">185,000,000 đ</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block truncate">Biên LN gộp</span>
                      <strong className="text-xs font-black text-emerald-800 tabular-nums">22.1%</strong>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div>
                    {salesSubmitted ? (
                      <div className="w-full min-h-[44px] py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 animate-fade-in text-center px-2 leading-tight">
                        <CheckOutlined className="text-emerald-600 shrink-0" />
                        <span>ĐÃ NỘP HỒ SƠ LÊN BAN GIÁM ĐỐC XÉT DUYỆT</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSalesSubmit}
                        className="w-full min-h-[44px] py-2.5 rounded-xl text-white text-xs font-extrabold hover:shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-2 touch-manipulation px-3 text-center leading-tight"
                        style={{ backgroundColor: themeTokens.brand.primary[900] }}
                      >
                        <SendOutlined className="shrink-0" />
                        <span>Nộp Duyệt Giá Bán Lên Ban Giám Đốc</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Status Ribbon (Responsive wrap on mobile) */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-0 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Hàng đợi BullMQ & Redis 7 kết nối trực tiếp</span>
              </span>
              <span className="font-semibold text-(--color-primary-700) shrink-0 self-start sm:self-auto">
                Bảo toàn số dư NUMERIC(18,2)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
