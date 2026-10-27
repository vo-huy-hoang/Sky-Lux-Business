'use client';

import React from 'react';
import Link from 'next/link';
import { Col, Row, Skeleton } from 'antd';
import {
  ClockCircleOutlined,
  DollarOutlined,
  FolderOpenOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { formatCurrency } from '@/lib/financial-calculations';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  tone?: 'green' | 'gold' | 'blue' | 'purple';
  loading?: boolean;
  href?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  hint,
  tone = 'green',
  loading,
  href,
}: MetricCardProps) {
  const toneClasses = {
    green:
      'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border-[var(--color-primary-soft-2)]',
    gold: 'bg-[var(--color-gold-soft)] text-[var(--color-gold-strong)] border-[var(--color-gold-soft)]',
    blue: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-soft)]',
    purple:
      'bg-[var(--color-purple-soft)] text-[var(--color-purple)] border-[var(--color-purple-soft)]',
  };

  const cardBody = (
    <div
      className={`bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between h-full transition-all duration-200 ${
        href
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 group'
          : ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${toneClasses[tone]} [&_.anticon]:text-sm transition-transform duration-200 ${
            href ? 'group-hover:scale-105' : ''
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium leading-tight line-clamp-2">
              {label}
            </span>
            {href && (
              <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 font-mono">
                ↗
              </span>
            )}
          </div>
          <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
            {loading ? <Skeleton.Input active size="small" /> : value}
          </div>
          {hint && (
            <div className="text-[11px] text-slate-400 mt-1 truncate font-normal">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full no-underline text-inherit"
        aria-label={`Xem chi tiết ${label}`}
      >
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}

interface CeoMetricsGridProps {
  overview?: {
    totalRevenue?: number | string;
    totalProfit?: number | string;
  };
  totalDossiers: number;
  pendingCount: number;
  isLoading: boolean;
  allTime: boolean;
  currentMonthLabel: string;
}

export default function CeoMetricsGrid({
  overview,
  totalDossiers,
  pendingCount,
  isLoading,
  allTime,
  currentMonthLabel,
}: CeoMetricsGridProps) {
  const revenueHint =
    Number(overview?.totalRevenue || 0) > 0
      ? 'Dữ liệu hồ sơ đã khóa sổ'
      : allTime
      ? 'Chưa có hồ sơ khóa sổ'
      : 'Chưa có hồ sơ khóa sổ trong tháng đã chọn';

  const profitHint =
    Number(overview?.totalProfit || 0) > 0
      ? 'Theo lợi nhuận gộp hồ sơ'
      : allTime
      ? 'Chưa có hồ sơ khóa sổ'
      : 'Chưa có hồ sơ khóa sổ trong tháng đã chọn';

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={12} lg={6}>
        <MetricCard
          label={allTime ? 'Tổng doanh thu' : `Doanh thu ${currentMonthLabel}`}
          value={formatCurrency(overview?.totalRevenue)}
          hint={revenueHint}
          icon={<DollarOutlined />}
          loading={isLoading}
          href="/revenue"
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <MetricCard
          label={allTime ? 'Tổng lợi nhuận' : `Lợi nhuận ${currentMonthLabel}`}
          value={formatCurrency(overview?.totalProfit)}
          hint={profitHint}
          icon={<LineChartOutlined />}
          loading={isLoading}
          href="/revenue"
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <MetricCard
          label="Hồ sơ toàn hệ thống"
          value={totalDossiers}
          hint="Tổng theo mọi trạng thái"
          icon={<FolderOpenOutlined />}
          tone="blue"
          loading={isLoading}
          href="/dossiers"
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <MetricCard
          label="Hồ sơ chờ duyệt"
          value={pendingCount}
          hint={
            pendingCount > 0 ? 'Cần CEO xem xét và duyệt' : 'Không có hồ sơ tồn đọng'
          }
          icon={<ClockCircleOutlined />}
          tone="gold"
          loading={isLoading}
          href="/approvals"
        />
      </Col>
    </Row>
  );
}
