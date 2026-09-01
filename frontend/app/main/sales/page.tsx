'use client';

import React, { useMemo } from 'react';
import { Avatar, Card, Empty, Progress, Skeleton, Table, Tag, Typography } from 'antd';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, ChartOptions, Legend, LinearScale, Tooltip } from 'chart.js';
import { CheckCircleOutlined, DollarOutlined, FolderOpenOutlined, TeamOutlined } from '@ant-design/icons';

import { useOperatorSalesSummary } from '@/hooks/dashboards';
import { OperatorSalesSummaryItem } from '@/types/dashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
const { Text } = Typography;

function money(value?: number | null) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;
}

function compact(value?: number | null) {
  const number = value || 0;
  if (Math.abs(number) >= 1_000_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} tỷ`;
  if (Math.abs(number) >= 1_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000)} tr`;
  return new Intl.NumberFormat('vi-VN').format(number);
}

function Metric({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone: 'green' | 'gold' | 'orange' | 'blue' }) {
  return (
    <Card className="op-card op-kpi-card">
      <div className="flex items-center gap-4">
        <span className={`op-metric-icon op-metric-${tone}`}>{icon}</span>
        <div>
          <Text className="text-sm text-[var(--op-text-muted)]">{label}</Text>
          <strong className="mt-1 block text-[24px] leading-none tabular-nums text-[var(--op-primary-900)]">{value}</strong>
        </div>
      </div>
    </Card>
  );
}

export default function OperatorSalesPage() {
  const { data: salesList = [], isLoading } = useOperatorSalesSummary();

  const totalSales = salesList.length;
  const totalDossiers = useMemo(() => salesList.reduce((sum, item) => sum + item.totalDossiers, 0), [salesList]);
  const totalApproved = useMemo(() => salesList.reduce((sum, item) => sum + item.approvedDossiers, 0), [salesList]);
  const totalRevenue = useMemo(() => salesList.reduce((sum, item) => sum + item.totalRevenue, 0), [salesList]);

  // Dossiers chart
  const dossiersChartData = useMemo(() => ({
    labels: salesList.slice(0, 8).map((s) => s.salesUserName),
    datasets: [
      {
        label: 'Hồ sơ phụ trách',
        data: salesList.slice(0, 8).map((s) => s.totalDossiers),
        backgroundColor: '#004230',
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  }), [salesList]);

  // Revenue chart
  const revenueChartData = useMemo(() => ({
    labels: salesList.slice(0, 8).map((s) => s.salesUserName),
    datasets: [
      {
        label: 'Doanh thu (VNĐ)',
        data: salesList.slice(0, 8).map((s) => s.totalRevenue),
        backgroundColor: '#D4AF37',
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  }), [salesList]);

  const barRevenueOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => money(context.parsed.x),
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (v) => compact(Number(v)) },
        grid: { color: '#EEF0EF' },
        border: { display: false },
      },
      y: { grid: { display: false }, border: { display: false } },
    },
  };

  const columns = [
    {
      title: 'Sales',
      key: 'sales',
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-[#004230] text-[#D6A51F]">{row.salesUserName.charAt(0)}</Avatar>
          <div>
            <Text strong className="block">{row.salesUserName}</Text>
            <Text className="text-xs text-[var(--op-text-muted)]">{row.salesUserEmail || row.employeeCode || 'Sales Staff'}</Text>
          </div>
        </div>
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
      render: (val: number) => <strong className="tabular-nums">{val}</strong>,
    },
    {
      title: 'Đã duyệt / Hoàn tất',
      dataIndex: 'approvedDossiers',
      key: 'approvedDossiers',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-semibold text-emerald-700">{val}</span>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      render: (val: number) => <strong className="tabular-nums text-[#004230]">{money(val)}</strong>,
    },
    {
      title: 'Lợi nhuận gộp',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      align: 'right' as const,
      render: (val: number) => <strong className="tabular-nums text-amber-700">{money(val)}</strong>,
    },
    {
      title: 'Tỷ lệ duyệt',
      key: 'completionRate',
      width: 180,
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <div className="flex items-center gap-2">
          <Progress percent={row.completionRate} size="small" showInfo={false} strokeColor="#0B7A5B" />
          <span className="w-10 tabular-nums text-xs font-semibold">{row.completionRate}%</span>
        </div>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'status',
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <Tag className={row.completionRate >= 80 ? 'op-status-valid' : row.completionRate >= 50 ? 'op-status-info' : 'op-status-warning'}>
          {row.completionRate >= 80 ? 'Xuất sắc' : row.completionRate >= 50 ? 'Đạt chuẩn' : 'Cần hỗ trợ'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="op-page space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Metric label="Tổng Nhân sự Sales" value={isLoading ? <Skeleton.Input active size="small" /> : totalSales} icon={<TeamOutlined />} tone="green" />
        <Metric label="Tổng Doanh thu Sales" value={isLoading ? <Skeleton.Input active size="small" /> : compact(totalRevenue)} icon={<DollarOutlined />} tone="gold" />
        <Metric label="Hồ sơ đã phê duyệt" value={isLoading ? <Skeleton.Input active size="small" /> : totalApproved} icon={<CheckCircleOutlined />} tone="blue" />
        <Metric label="Tổng Hồ sơ phụ trách" value={isLoading ? <Skeleton.Input active size="small" /> : totalDossiers} icon={<FolderOpenOutlined />} tone="orange" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="op-card" title="Hồ sơ phụ trách theo Sales">
          <div className="h-[310px]">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : salesList.length ? (
              <Bar
                data={dossiersChartData}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (context) => `${context.parsed.x} hồ sơ` } },
                  },
                  scales: {
                    x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF0EF' }, border: { display: false } },
                    y: { grid: { display: false }, border: { display: false } },
                  },
                }}
              />
            ) : (
              <Empty description="Chưa có dữ liệu Sales" />
            )}
          </div>
        </Card>

        <Card className="op-card" title="Doanh thu thực tế theo Sales">
          <div className="h-[310px]">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : salesList.length ? (
              <Bar data={revenueChartData} options={barRevenueOptions} />
            ) : (
              <Empty description="Chưa có dữ liệu Doanh thu Sales" />
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

