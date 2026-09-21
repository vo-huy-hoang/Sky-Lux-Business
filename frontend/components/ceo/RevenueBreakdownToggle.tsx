import { AppstoreOutlined, GlobalOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

export type RevenueBreakdownMode = 'BUSINESS_LINE' | 'MARKET_TYPE';

interface RevenueBreakdownToggleProps {
  value: RevenueBreakdownMode;
  onChange: (value: RevenueBreakdownMode) => void;
}

export function RevenueBreakdownToggle({ value, onChange }: RevenueBreakdownToggleProps) {
  const options: Array<{
    value: RevenueBreakdownMode;
    label: string;
    icon: ReactNode;
  }> = [
    { value: 'BUSINESS_LINE', label: 'Mảng', icon: <AppstoreOutlined /> },
    { value: 'MARKET_TYPE', label: 'Loại hình', icon: <GlobalOutlined /> },
  ];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="group"
      aria-label="Chọn cách phân loại doanh thu"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              isActive
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
