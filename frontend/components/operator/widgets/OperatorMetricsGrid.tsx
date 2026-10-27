'use client';

import React from 'react';
import Link from 'next/link';
import { Skeleton } from 'antd';
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FolderOpenOutlined,
  ShopOutlined,
} from '@ant-design/icons';

interface SummaryMetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: 'green' | 'blue' | 'gold' | 'orange';
  loading: boolean;
  href?: string;
}

export function SummaryMetricCard({
  label,
  value,
  icon,
  tone,
  loading,
  href,
}: SummaryMetricCardProps) {
  const toneClasses = {
    green:
      'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border-[var(--color-primary-soft-2)]',
    blue: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-soft)]',
    gold: 'bg-[var(--color-gold-soft)] text-[var(--color-gold-strong)] border-[var(--color-gold-soft)]',
    orange:
      'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-soft)]',
  };

  const cardContent = (
    <div
      className={`bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-2 xl:p-2.5 2xl:p-3.5 flex flex-col justify-between h-full min-w-0 ${
        href
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200'
          : ''
      }`}
    >
      <div className="flex items-center gap-2 xl:gap-2.5 min-w-0">
        <div
          className={`w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg border flex items-center justify-center shrink-0 ${toneClasses[tone]} [&_.anticon]:text-sm`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs text-slate-500 font-medium leading-tight line-clamp-2">
            {label}
          </span>
          <div className="text-[12px] 2xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
            {loading ? <Skeleton.Input active size="small" /> : value}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full group focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] rounded-xl"
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

interface OperatorMetricsGridProps {
  totalDossiersCount: number;
  pendingApprovalsCount: number;
  activeDossiers: number;
  priorityDossiers: number;
  totalSuppliers: number;
  isLoading: boolean;
}

export default function OperatorMetricsGrid({
  totalDossiersCount,
  pendingApprovalsCount,
  activeDossiers,
  priorityDossiers,
  totalSuppliers,
  isLoading,
}: OperatorMetricsGridProps) {
  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
      aria-label="Chỉ số vận hành điều hành"
    >
      <SummaryMetricCard
        label="Hồ sơ toàn hệ thống"
        value={totalDossiersCount}
        icon={<FolderOpenOutlined />}
        tone="blue"
        loading={isLoading}
        href="/dossiers"
      />
      <SummaryMetricCard
        label="Hồ sơ chờ duyệt"
        value={pendingApprovalsCount}
        icon={<ClockCircleOutlined />}
        tone="gold"
        loading={isLoading}
        href="/dossiers?status=SUBMITTED"
      />
      <SummaryMetricCard
        label="Hồ sơ đang xử lý"
        value={activeDossiers}
        icon={<FolderOpenOutlined />}
        tone="green"
        loading={isLoading}
        href="/dossiers?status=IN_REVIEW"
      />
      <SummaryMetricCard
        label="Ưu tiên cao / Khẩn cấp"
        value={priorityDossiers}
        icon={<ExclamationCircleOutlined />}
        tone="orange"
        loading={isLoading}
        href="/dossiers?priority=HIGH"
      />
      <SummaryMetricCard
        label="Nhà cung cấp đối tác"
        value={totalSuppliers}
        icon={<ShopOutlined />}
        tone="blue"
        loading={isLoading}
        href="/suppliers"
      />
    </section>
  );
}
