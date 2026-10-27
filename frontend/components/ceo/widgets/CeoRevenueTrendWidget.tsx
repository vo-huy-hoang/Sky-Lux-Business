'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Empty, Skeleton } from 'antd';
import type { ChartOptions } from 'chart.js';
import { CeoMonthlyTrendItem } from '@/types/dashboard';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import { themeTokens } from '@/lib/theme/tokens.config';

const CeoMonthlyRevenueChart = dynamic(
  () => import('@/components/ceo/CeoMonthlyRevenueChart'),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 5 }} />,
  },
);

interface CeoRevenueTrendWidgetProps {
  monthlyTrend: CeoMonthlyTrendItem[];
  isLoadingTrend: boolean;
  allTime: boolean;
  selectedYear: number;
}

export default function CeoRevenueTrendWidget({
  monthlyTrend,
  isLoadingTrend,
  allTime,
  selectedYear,
}: CeoRevenueTrendWidgetProps) {
  const maxMonthlyValue = useMemo(
    () =>
      Math.max(
        1,
        ...monthlyTrend.map(
          (month: CeoMonthlyTrendItem) => Number(month.totalRevenue || 0) / 1_000_000,
        ),
        ...monthlyTrend.map(
          (month: CeoMonthlyTrendItem) => Number(month.totalProfit || 0) / 1_000_000,
        ),
      ),
    [monthlyTrend],
  );

  const displayLineData = useMemo(
    () => ({
      labels: monthlyTrend.map((month: CeoMonthlyTrendItem) => month.label),
      datasets: [
        {
          label: 'Doanh thu (đ)',
          data: monthlyTrend.map(
            (month: CeoMonthlyTrendItem) =>
              Number(month.totalRevenue || 0) / 1_000_000,
          ),
          borderColor: themeTokens.brand.primary[800],
          backgroundColor: themeTokens.brand.primary[800],
          pointBackgroundColor: themeTokens.neutral.surface,
          pointBorderColor: themeTokens.brand.primary[800],
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          borderWidth: 2.2,
        },
        {
          label: 'Lợi nhuận (đ)',
          data: monthlyTrend.map(
            (month: CeoMonthlyTrendItem) =>
              Number(month.totalProfit || 0) / 1_000_000,
          ),
          borderColor: themeTokens.brand.gold.main,
          backgroundColor: themeTokens.brand.gold.main,
          pointBackgroundColor: themeTokens.neutral.surface,
          pointBorderColor: themeTokens.brand.gold.main,
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          borderWidth: 2.2,
        },
      ],
    }),
    [monthlyTrend],
  );

  const displayLineOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeTokens.brand.primary[950],
          padding: 10,
          cornerRadius: 8,
          titleFont: { size: 12, weight: 600 },
          bodyFont: { size: 12 },
          callbacks: {
            label: (context) => {
              const valueInMillions = Number(context.parsed.y || 0);
              const originalValue = valueInMillions * 1_000_000;
              return `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
              }).format(originalValue)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: themeTokens.neutral.textMuted,
            font: { size: 11, weight: 500 },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.ceil(maxMonthlyValue * 1.15),
          grid: { color: themeTokens.neutral.border, lineWidth: 0.8 },
          border: { display: false },
          ticks: {
            color: themeTokens.neutral.textMuted,
            font: { size: 11, weight: 500 },
            callback: (value) => (value === 0 ? '0' : `${value}M`),
          },
        },
      },
    }),
    [maxMonthlyValue],
  );

  return (
    <WidgetErrorBoundary title="Doanh thu theo tháng">
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-900 m-0">Doanh thu theo tháng</h2>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
                {allTime ? 'Tất cả thời gian' : `Năm ${selectedYear}`}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="w-3.5 h-1.5 rounded-full bg-[var(--color-primary-800)]" />
              <span>Doanh thu (đ)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="w-3.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
              <span>Lợi nhuận (đ)</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[215px] w-full">
            {isLoadingTrend ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : monthlyTrend.length ? (
              <CeoMonthlyRevenueChart
                data={displayLineData}
                options={displayLineOptions}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa phát sinh doanh thu khóa sổ trong năm"
              />
            )}
          </div>
        </div>
      </div>
    </WidgetErrorBoundary>
  );
}
