'use client';

import React, { useState } from 'react';
import {
  FileAddOutlined,
  SearchOutlined,
  AuditOutlined,
  CompassOutlined,
  LockOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';

const workflowSteps = [
  {
    step: '01',
    role: 'Kinh Doanh (Sales)',
    roleBadge: 'BƯỚC 1: TIẾP NHẬN BÁO GIÁ',
    icon: <FileAddOutlined />,
    title: 'Tiếp Nhận & Bóc Tách Dự Toán Excel',
    description:
      'Chuyên viên kinh doanh tiếp nhận yêu cầu từ khách hàng doanh nghiệp hoặc đại lý, tải lên file Excel dự toán mẫu. Hàng đợi BullMQ tự động bóc tách các dòng chi phí và khởi tạo hồ sơ tour ở trạng thái DRAFT.',
    deliverable: 'Hồ sơ Tour DRAFT + Bảng dự toán V1',
    metric: 'Bóc tách < 1.2s',
  },
  {
    step: '02',
    role: 'Điều Hành (Operator)',
    roleBadge: 'BƯỚC 2: KHẢO GIÁ DỊCH VỤ',
    icon: <SearchOutlined />,
    title: 'Bóc Tách Chi Phí & Khảo Giá Net Đối Tác',
    description:
      'Bộ phận điều hành liên hệ các đối tác cung ứng trong mạng lưới (khách sạn, nhà xe, nhà hàng, vé tham quan) để chốt giá Net, bổ sung thuế VAT và tính toán tỷ suất lợi nhuận gộp an toàn cho tour.',
    deliverable: 'Chi phí Cost Lines chi tiết + Gán Nhà Cung Cấp',
    metric: 'Kiểm soát tỷ suất LN',
  },
  {
    step: '03',
    role: 'Ban Giám Đốc (CEO)',
    roleBadge: 'BƯỚC 3: PHÊ DUYỆT GIÁ BÁN',
    icon: <AuditOutlined />,
    title: 'Phê Duyệt Giá Thương Mại & Đóng Băng',
    description:
      'Ban Giám Đốc mở trung tâm phê duyệt, xem xét biên lợi nhuận gộp (Gross Margin %) so với chỉ tiêu kế hoạch. Bấm Phê Duyệt để đóng băng giá, kích hoạt bước ký hợp đồng và thu cọc của khách hàng.',
    deliverable: 'Hồ sơ APPROVED + Khóa sửa số tiền dự toán',
    metric: 'Chống thất thoát doanh thu',
  },
  {
    step: '04',
    role: 'Điều Hành Tour',
    roleBadge: 'BƯỚC 4: TRIỂN KHAI TOUR',
    icon: <CompassOutlined />,
    title: 'Điều Phối Dịch Vụ & Lịch Trình Khởi Hành',
    description:
      'Điều hành phân công hướng dẫn viên, đặt cọc dịch vụ, theo dõi checklist công việc trước giờ khởi hành và nhận cảnh báo tự động về hạn thanh toán cọc đối tác trước 48h để đảm bảo dịch vụ không bị gián đoạn.',
    deliverable: 'Checklist hoàn tất + Lịch khởi hành đoàn tour',
    metric: 'Cảnh báo hạn cọc 48h',
  },
  {
    step: '05',
    role: 'Kế Toán & Giám Đốc',
    roleBadge: 'BƯỚC 5: KHÓA SỔ TÀI CHÍNH',
    icon: <LockOutlined />,
    title: 'Đối Soát Thực Tế & Khóa Sổ Vĩnh Viễn',
    description:
      'Sau khi đoàn tour hoàn tất, kế toán đối soát toàn bộ phiếu thu thực tế từ khách và hóa đơn chi đối tác, kiểm tra chênh lệch chi phí thực tế và thực hiện Khóa hồ sơ (LOCKED) bất biến.',
    deliverable: 'Quyết toán tài chính + Đóng băng chứng từ vĩnh viễn',
    metric: 'Bảo toàn số dư NUMERIC(18,2)',
  },
];

export function ClientWorkflowSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  return (
    <section id="workflow" className="scroll-mt-24 sm:scroll-mt-28 py-24 md:py-36 bg-white border-t border-slate-100 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="p-1 rounded-full bg-emerald-950/[0.04] ring-1 ring-emerald-900/[0.08] inline-block mb-4 shadow-2xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-(--color-primary-800) text-[11px] font-black uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-primary-600)" />
              QUY TRÌNH VẬN HÀNH KHÉP KÍN
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-(--color-text) tracking-tight leading-[1.15]">
            5 Giai Đoạn Từ Báo Giá <br className="hidden sm:inline" />
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(135deg, ${themeTokens.brand.primary[900]}, ${themeTokens.brand.primary[600]})`,
              }}
            >
              Đến Quyết Toán Khóa Sổ Hồ Sơ Tour
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            Quy trình làm việc chuẩn hóa giúp các phòng ban phối hợp nhịp nhàng, triệt tiêu sai sót dữ liệu và bảo đảm dòng tiền minh bạch.
          </p>
        </div>

        {/* 5-Step Visual Interactive Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step Selector Column (Left - 5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {workflowSteps.map((item, index) => {
              const isActive = activeStepIndex === index;
              return (
                <div
                  key={item.step}
                  onClick={() => setActiveStepIndex(index)}
                  className={`p-4 rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                    isActive
                      ? 'bg-slate-50 border-(--color-primary-700) shadow-md ring-1 ring-(--color-primary-700)/25'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                        isActive
                          ? 'bg-(--color-primary-900) text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {item.step}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {item.role}
                      </div>
                      <div
                        className={`text-sm font-extrabold transition-colors duration-200 ${
                          isActive ? 'text-(--color-primary-900)' : 'text-slate-800'
                        }`}
                      >
                        {item.title}
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-(--color-primary-700)" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Detail Card with Double-Bezel (Right - 7 Cols) */}
          <div className="lg:col-span-7">
            <div className="p-1.5 sm:p-2 rounded-[2.2rem] bg-slate-900/[0.03] ring-1 ring-slate-900/[0.06] shadow-sm">
              <div className="bg-white rounded-[calc(2.2rem-0.5rem)] p-5 sm:p-8 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] min-h-[400px] flex flex-col justify-between transition-all">
                <div>
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-3.5 py-1 rounded-full bg-emerald-50 text-(--color-primary-800) border border-emerald-200/60">
                        GIAI ĐOẠN {workflowSteps[activeStepIndex].step}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        • {workflowSteps[activeStepIndex].roleBadge}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-xl text-(--color-primary-700) shadow-xs">
                      {workflowSteps[activeStepIndex].icon}
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-(--color-text) mb-4">
                    {workflowSteps[activeStepIndex].title}
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed mb-8 font-medium">
                    {workflowSteps[activeStepIndex].description}
                  </p>
                </div>

                {/* Deliverable Box with Nested Action Button */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3.5">
                    <CheckCircleFilled style={{ color: themeTokens.brand.primary[700] }} className="text-xl shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">
                        Chuyển giao giai đoạn:
                      </span>
                      <strong className="text-sm font-extrabold text-(--color-primary-900)">
                        {workflowSteps[activeStepIndex].deliverable}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setActiveStepIndex((prev) => (prev + 1) % workflowSteps.length)
                    }
                    className="pl-5 pr-2 py-2 rounded-full text-white text-xs font-bold hover:shadow-md active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-xs flex items-center gap-2.5 group"
                    style={{ backgroundColor: themeTokens.brand.primary[900] }}
                  >
                    <span>Giai đoạn tiếp theo</span>
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-all group-hover:translate-x-0.5">
                      <ArrowRightOutlined className="text-[9px]" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
