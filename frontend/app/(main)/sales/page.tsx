'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Avatar, Card, Progress, Skeleton, Table, Tag, Tooltip, Typography } from 'antd';
import {
  CheckCircleOutlined,
  DollarOutlined,
  FolderOpenOutlined,
  TeamOutlined,
} from '@ant-design/icons';

import { useOperatorSalesSummary } from '@/hooks/dashboards';
import { OperatorSalesSummaryItem } from '@/types/dashboard';
import { formatCurrency } from '@/lib/financial-calculations';
import { themeTokens } from '@/lib/theme/tokens.config';

// Dynamic import with ssr: false for fast initial page load (<100ms)
const SalesDossiersChart = dynamic(
  () => import('@/components/sales/SalesDossiersChart'),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 6 }} />,
  },
);

const SalesRevenueChart = dynamic(
  () => import('@/components/sales/SalesRevenueChart'),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 6 }} />,
  },
);

const { Text } = Typography;

function money(value?: number | null) {
  return formatCurrency(value);
}

function compact(value?: number | null) {
  return formatCurrency(value, { compact: true, showSymbol: false });
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: 'green' | 'gold' | 'orange' | 'blue';
}) {
  return (
    <Card className="op-card op-kpi-card">
      <div className="flex items-center gap-4">
        <span className={`op-metric-icon op-metric-${tone}`}>{icon}</span>
        <div>
          <Text className="text-sm text-[var(--op-text-muted)]">{label}</Text>
          <strong className="mt-1 block text-[24px] leading-none tabular-nums text-[var(--op-primary-900)]">
            {value}
          </strong>
        </div>
      </div>
    </Card>
  );
}

export default function OperatorSalesPage() {
  const { data: salesList = [], isLoading } = useOperatorSalesSummary();

  const totalSales = salesList.length;
  const totalDossiers = useMemo(
    () => salesList.reduce((sum, item) => sum + item.totalDossiers, 0),
    [salesList],
  );
  const totalApproved = useMemo(
    () => salesList.reduce((sum, item) => sum + item.approvedDossiers, 0),
    [salesList],
  );
  const totalRevenue = useMemo(
    () => salesList.reduce((sum, item) => sum + item.totalRevenue, 0),
    [salesList],
  );

  const columns = [
    {
      title: 'Sales',
      key: 'sales',
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <Tooltip title={`Xem toàn bộ hồ sơ của ${row.salesUserName}`}>
          <Link
            href={`/dossiers?salesUserId=${row.salesUserId}`}
            className="group flex items-center gap-3 text-inherit transition-colors hover:text-[var(--color-primary-900)]"
          >
            <Avatar className="bg-[var(--color-primary-900)] text-[var(--color-gold)] transition-transform group-hover:scale-105">
              {row.salesUserName?.charAt(0) || 'S'}
            </Avatar>
            <div>
              <Text strong className="block transition-colors group-hover:text-[var(--color-primary-900)] group-hover:underline">
                {row.salesUserName}
              </Text>
              <Text className="text-xs text-[var(--op-text-muted)]">
                {row.salesUserEmail || row.employeeCode || 'Sales Staff'}
              </Text>
            </div>
          </Link>
        </Tooltip>
      ),
    },
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      render: (val: string) => <Tag>{val || 'N/A'}</Tag>,
    },
    {
      title: 'Hồ sơ phụ trách',
      dataIndex: 'totalDossiers',
      key: 'totalDossiers',
      align: 'right' as const,
      render: (val: number, row: OperatorSalesSummaryItem) => (
        <Tooltip title={`Bấm để xem ${val} hồ sơ của ${row.salesUserName}`}>
          <Link
            href={`/dossiers?salesUserId=${row.salesUserId}`}
            className="inline-flex items-center gap-1.5 font-bold text-slate-800 transition-colors hover:text-[var(--color-primary-900)] hover:underline"
          >
            <span className="tabular-nums">{val}</span>
            <FolderOpenOutlined className="text-xs text-slate-400" />
          </Link>
        </Tooltip>
      ),
    },
    {
      title: 'Đã duyệt / Hoàn tất',
      dataIndex: 'approvedDossiers',
      key: 'approvedDossiers',
      align: 'right' as const,
      render: (val: number, row: OperatorSalesSummaryItem) => (
        <Tooltip title={`Bấm để xem ${val} hồ sơ đã duyệt của ${row.salesUserName}`}>
          <Link
            href={`/dossiers?salesUserId=${row.salesUserId}&status=APPROVED`}
            className="tabular-nums font-semibold text-emerald-700 hover:underline"
          >
            {val}
          </Link>
        </Tooltip>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      render: (val: number) => (
        <strong className="tabular-nums text-[var(--color-primary-900)]">{money(val)}</strong>
      ),
    },
    {
      title: 'Lợi nhuận gộp',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      align: 'right' as const,
      render: (val: number) => (
        <strong className="tabular-nums text-amber-700">{money(val)}</strong>
      ),
    },
    {
      title: 'Tỷ lệ duyệt',
      key: 'completionRate',
      width: 180,
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={row.completionRate}
            size="small"
            showInfo={false}
            strokeColor={themeTokens.brand.primary[600]}
          />
          <span className="w-10 tabular-nums text-xs font-semibold">
            {row.completionRate}%
          </span>
        </div>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'status',
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <Tag
          className={
            row.completionRate >= 80
              ? 'op-status-valid'
              : row.completionRate >= 50
                ? 'op-status-info'
                : 'op-status-warning'
          }
        >
          {row.completionRate >= 80
            ? 'Xuất sắc'
            : row.completionRate >= 50
              ? 'Đạt chuẩn'
              : 'Cần hỗ trợ'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="op-page space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Metric
          label="Tổng Nhân sự Sales"
          value={isLoading ? <Skeleton.Input active size="small" /> : totalSales}
          icon={<TeamOutlined />}
          tone="green"
        />
        <Metric
          label="Tổng Doanh thu Sales"
          value={isLoading ? <Skeleton.Input active size="small" /> : compact(totalRevenue)}
          icon={<DollarOutlined />}
          tone="gold"
        />
        <Metric
          label="Hồ sơ đã phê duyệt"
          value={isLoading ? <Skeleton.Input active size="small" /> : totalApproved}
          icon={<CheckCircleOutlined />}
          tone="blue"
        />
        <Metric
          label="Tổng Hồ sơ phụ trách"
          value={isLoading ? <Skeleton.Input active size="small" /> : totalDossiers}
          icon={<FolderOpenOutlined />}
          tone="orange"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="op-card" title="Hồ sơ phụ trách theo Sales">
          <div className="h-[310px]">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
              <SalesDossiersChart items={salesList} />
            )}
          </div>
        </Card>

        <Card className="op-card" title="Doanh thu thực tế theo Sales">
          <div className="h-[310px]">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
              <SalesRevenueChart items={salesList} />
            )}
          </div>
        </Card>
      </div>

      <Card className="op-card" title="Bảng tổng hợp hiệu suất & Doanh thu Sales">
        <Table
          className="op-table"
          rowKey={(row) => row.salesUserId}
          loading={isLoading}
          dataSource={salesList}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}
