'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card, Empty, Skeleton, Table, Tag } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { DossierItem } from '@/types/dossier';
import { OperatorSalesSummaryItem } from '@/types/dashboard';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import { formatCurrency } from '@/lib/financial-calculations';
import { themeTokens } from '@/lib/theme/tokens.config';

const STATUS_META: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới tạo', className: 'skylux-status-info', color: themeTokens.neutral.textSoft },
  SUBMITTED: { label: 'Chờ duyệt', className: 'skylux-status-purple', color: themeTokens.semantic.purple.main },
  RESUBMITTED: { label: 'Đã gửi lại', className: 'skylux-status-purple', color: themeTokens.semantic.purple.main },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: themeTokens.brand.gold.main },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: themeTokens.semantic.success.main },
  NEED_CHANGES: { label: 'Cần sửa đổi', className: 'skylux-status-warning', color: themeTokens.brand.gold.main },
  EDITING: { label: 'Đang sửa đổi', className: 'skylux-status-info', color: themeTokens.neutral.textSoft },
  COMPLETED: { label: 'Đã hoàn thành', className: 'skylux-status-valid', color: themeTokens.semantic.success.dark },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: themeTokens.semantic.danger.main },
};

function statusMeta(status?: string) {
  return (
    STATUS_META[status || ''] || {
      label: status || 'Chưa rõ',
      className: 'skylux-status-info',
      color: themeTokens.neutral.textSoft,
    }
  );
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function CeoSalesRanking({
  topSalesList,
  isLoadingSales,
}: {
  topSalesList: Array<OperatorSalesSummaryItem & { rank: number; progress: number }>;
  isLoadingSales: boolean;
}) {
  return (
    <WidgetErrorBoundary title="Doanh thu theo Sales">
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-slate-900 m-0">Top 5 Sales theo doanh thu</h2>
          </div>

          <div className="max-h-[520px] space-y-3.5 overflow-y-auto pr-1">
            {isLoadingSales ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : topSalesList.length ? (
              topSalesList.map((sales) => (
                <div
                  key={sales.salesUserId}
                  className="grid grid-cols-[14px_24px_minmax(0,1.2fr)_minmax(35px,1fr)_auto] items-center gap-2 text-xs"
                >
                  <span
                    className={`font-bold text-xs ${
                      sales.rank <= 3 ? 'text-amber-500' : 'text-slate-500'
                    }`}
                  >
                    {sales.rank}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-700)] flex items-center justify-center text-[10px] font-bold border border-slate-200 shrink-0">
                    {sales.salesUserName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span
                    className="truncate text-slate-800 font-medium"
                    title={sales.salesUserName}
                  >
                    {sales.salesUserName}
                  </span>
                  <div className="h-1 bg-transparent flex items-center w-full">
                    <div
                      className="h-0.75 bg-[var(--color-gold)] rounded-full"
                      style={{ width: `${sales.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap text-right">
                    {formatCurrency(sales.totalRevenue)}
                  </span>
                </div>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa ghi nhận doanh số khóa sổ của Sales"
              />
            )}
          </div>
        </div>

        <Link
          href="/reports"
          className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
        >
          <span>Xem báo cáo hiệu suất Sales</span>
          <ArrowRightOutlined className="text-[10px]" />
        </Link>
      </div>
    </WidgetErrorBoundary>
  );
}

export function CeoDossiersTable({
  latestDossiers,
  isLoadingDossiers,
}: {
  latestDossiers: DossierItem[];
  isLoadingDossiers: boolean;
}) {
  const dossierColumns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      width: 280,
      render: (value: string, record: DossierItem) => (
        <Link
          className="font-semibold text-[var(--ceo-primary-700)] whitespace-nowrap hover:underline"
          href={`/dossiers/${record.id}`}
        >
          {value}
        </Link>
      ),
    },
    {
      title: 'Khách hàng',
      width: 220,
      render: (_: unknown, record: DossierItem) => (
        <span
          className="truncate block"
          title={record.customer?.displayName || record.name}
        >
          {record.customer?.displayName || record.name}
        </span>
      ),
    },
    {
      title: 'Sales',
      width: 160,
      render: (_: unknown, record: DossierItem) =>
        record.salesUser?.fullName || '-',
    },
    {
      title: 'Điều hành',
      width: 160,
      render: (_: unknown, record: DossierItem) =>
        record.operatorUser?.fullName || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (value: string) => {
        const meta = statusMeta(value);
        return <Tag className={meta.className}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'updatedAt',
      width: 160,
      render: formatDateTime,
    },
  ];

  return (
    <WidgetErrorBoundary title="Hồ sơ toàn hệ thống - Cập nhật gần nhất">
      <Card
        className="ceo-card"
        title="Hồ sơ toàn hệ thống - Cập nhật gần nhất"
        extra={
          <Button type="link" href="/dossiers">
            Xem tất cả
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={latestDossiers}
          columns={dossierColumns}
          loading={isLoadingDossiers}
          pagination={false}
          className="ceo-table"
          scroll={{ x: 1080 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có hồ sơ phát sinh gần đây"
              />
            ),
          }}
        />
      </Card>
    </WidgetErrorBoundary>
  );
}

interface CeoPerformanceTableProps {
  topSalesList: Array<OperatorSalesSummaryItem & { rank: number; progress: number }>;
  latestDossiers: DossierItem[];
  isLoadingSales: boolean;
  isLoadingDossiers: boolean;
}

export default function CeoPerformanceTable({
  topSalesList,
  latestDossiers,
  isLoadingSales,
  isLoadingDossiers,
}: CeoPerformanceTableProps) {
  return (
    <div className="space-y-4">
      <CeoSalesRanking topSalesList={topSalesList} isLoadingSales={isLoadingSales} />
      <CeoDossiersTable latestDossiers={latestDossiers} isLoadingDossiers={isLoadingDossiers} />
    </div>
  );
}
