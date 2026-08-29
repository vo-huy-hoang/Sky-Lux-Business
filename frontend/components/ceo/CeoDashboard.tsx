'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FolderOpenOutlined,
  LineChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { dashboardsService } from '@/services/dashboards.service';
import { dossiersService } from '@/services/dossiers.service';
import { usersService } from '@/services/users.service';
import { DossierItem } from '@/types/dossier';
import { CeoDashboardData } from '@/types/dashboard';
import { UserItem } from '@/types/user';

ChartJS.register(
  ArcElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const { Text } = Typography;

const STATUS_META: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: '#98A19D' },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: '#7C59C8' },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: '#E39A16' },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple', color: '#2E82C4' },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: '#0A8A61' },
  COMPLETED: { label: 'Hoàn thành', className: 'skylux-status-valid', color: '#0F3D2E' },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: '#DC3F46' },
  LOCKED: { label: 'Đã khóa', className: 'skylux-status-danger', color: '#A62D34' },
};

function statusMeta(status?: string) {
  return STATUS_META[status || ''] || {
    label: status || 'Chưa xác định',
    className: 'skylux-status-info',
    color: '#65706B',
  };
}

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return '0 đ';
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

function formatCompactCurrency(value?: number) {
  const number = value || 0;
  if (Math.abs(number) >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} tỷ`;
  }
  if (Math.abs(number) >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000)} triệu`;
  }
  return new Intl.NumberFormat('vi-VN').format(number);
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

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'green',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  tone?: 'green' | 'gold' | 'blue' | 'purple';
  loading?: boolean;
}) {
  const tones = {
    green: 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]',
    gold: 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]',
    blue: 'bg-[var(--ceo-info-soft)] text-[var(--ceo-info)]',
    purple: 'bg-[var(--ceo-purple-soft)] text-[var(--ceo-purple)]',
  };

  return (
    <Card className="ceo-card ceo-metric-card h-full">
      <div className="flex items-start gap-3.5">
        <span className={`ceo-metric-icon ${tones[tone]}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <Text className="block truncate text-[13px] text-[var(--ceo-text-muted)]">{label}</Text>
          <div className="mt-1 min-h-8 truncate text-[24px] font-bold leading-8 text-[var(--ceo-text)] [font-variant-numeric:tabular-nums]">
            {loading ? <Skeleton.Input active size="small" /> : value}
          </div>
          <div className="mt-2 truncate text-[12px] font-medium text-[var(--ceo-primary-600)]">{hint}</div>
        </div>
      </div>
    </Card>
  );
}

export default function CeoDashboard() {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return {
        date: date.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: '2-digit' }).format(date),
      };
    });
  }, []);
  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
  } = useQuery({
    queryKey: ['dashboard-ceo', 'current-month'],
    queryFn: () => dashboardsService.getCeoDashboard({ periodType: 'MONTHLY' }),
  });

  const { data: dossierResponse, isLoading: isLoadingDossiers } = useQuery({
    queryKey: ['ceo-dashboard-dossiers'],
    queryFn: () => dossiersService.getDossiers({ page: 1, limit: 100 }),
  });

  const { data: userResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['ceo-dashboard-users'],
    queryFn: () => usersService.getUsers({ page: 1, pageSize: 100 }),
  });

  const monthlyQueries = useQueries({
    queries: months.map((month) => ({
      queryKey: ['dashboard-ceo', 'month', month.date],
      queryFn: () =>
        dashboardsService.getCeoDashboard({
          periodType: 'MONTHLY',
          date: month.date,
        }),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const dossiers = dossierResponse?.items || [];
  const users: UserItem[] = Array.isArray(userResponse)
    ? userResponse
    : userResponse?.data || [];
  const activeSales = users.filter(
    (user) => user.status === 'ACTIVE' && user.roles?.some((role) => role.code === 'SALES'),
  ).length;
  const funnel = overview?.funnel || [];
  const funnelMap = new Map(funnel.map((item) => [item.status, item.count]));
  const totalDossiers = funnel.reduce((sum, item) => sum + item.count, 0);
  const pendingCount = (funnelMap.get('SUBMITTED') || 0) + (funnelMap.get('IN_REVIEW') || 0);
  const latestDossiers = dossiers.slice(0, 6);
  const costBreakdown = overview?.costBreakdown || [];

  const lineData = {
    labels: months.map((month) => month.label),
    datasets: [
      {
        label: 'Doanh thu',
        data: monthlyQueries.map((query) => (query.data as CeoDashboardData | undefined)?.totalRevenue || 0),
        borderColor: '#0F3D2E',
        backgroundColor: '#0F3D2E',
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#0F3D2E',
        pointBorderWidth: 2,
        pointRadius: 3,
        tension: 0.35,
      },
      {
        label: 'Lợi nhuận',
        data: monthlyQueries.map((query) => (query.data as CeoDashboardData | undefined)?.totalProfit || 0),
        borderColor: '#D4AF37',
        backgroundColor: '#D4AF37',
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#D4AF37',
        pointBorderWidth: 2,
        pointRadius: 3,
        tension: 0.35,
      },
    ],
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        align: 'start',
        labels: { usePointStyle: true, boxWidth: 8, color: '#65706B', font: { size: 12 } },
      },
      tooltip: {
        callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#65706B' } },
      y: {
        beginAtZero: true,
        grid: { color: '#EEF1EF' },
        border: { display: false },
        ticks: { color: '#65706B', callback: (value) => formatCompactCurrency(Number(value)) },
      },
    },
  };

  const costData = {
    labels: costBreakdown.map((item) => item.categoryName),
    datasets: [
      {
        data: costBreakdown.map((item) => item.amount),
        backgroundColor: ['#0F3D2E', '#2C7459', '#D4AF37', '#5B80C6', '#7C59C8', '#14A9B5'],
        borderColor: '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 4,
      },
    ],
  };

  const costOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '66%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => `${context.label}: ${formatCurrency(context.parsed)}` } },
    },
  };

  const dossierColumns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      width: 126,
      render: (value: string, record: DossierItem) => (
        <Link className="font-semibold text-[var(--ceo-primary-700)]" href={`/main/dossiers/${record.id}`}>
          {value}
        </Link>
      ),
    },
    {
      title: 'Khách hàng',
      render: (_: unknown, record: DossierItem) => record.customer?.displayName || record.name,
    },
    { title: 'Sales', width: 160, render: (_: unknown, record: DossierItem) => record.salesUser?.fullName || '-' },
    { title: 'Điều hành', width: 160, render: (_: unknown, record: DossierItem) => record.operatorUser?.fullName || '-' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (value: string) => {
        const meta = statusMeta(value);
        return <Tag className={meta.className}>{meta.label}</Tag>;
      },
    },
    { title: 'Cập nhật cuối', dataIndex: 'updatedAt', width: 160, render: formatDateTime },
  ];

  if (isOverviewError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải dữ liệu điều hành"
        description="API dashboard CEO chưa phản hồi. Hãy kiểm tra kết nối rồi tải lại trang."
      />
    );
  }

  return (
    <div className="ceo-dashboard space-y-4">
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <MetricCard label="Tổng doanh thu tháng" value={formatCurrency(overview?.totalRevenue)} hint="Dữ liệu dự toán đã duyệt" icon={<DollarOutlined />} loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <MetricCard label="Lợi nhuận tháng" value={formatCurrency(overview?.totalProfit)} hint="Doanh thu trừ chi phí" icon={<LineChartOutlined />} loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <MetricCard label="Hồ sơ toàn hệ thống" value={totalDossiers} hint="Tổng theo trạng thái" icon={<FolderOpenOutlined />} tone="blue" loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <MetricCard label="Hồ sơ chờ duyệt" value={pendingCount} hint="Đã gửi và đang xem xét" icon={<ClockCircleOutlined />} tone="gold" loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <MetricCard label="Thời gian đóng hồ sơ" value={`${overview?.avgDossierClosingDays || 0} ngày`} hint="Trung bình hồ sơ hoàn thành" icon={<CheckCircleOutlined />} tone="purple" loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <MetricCard label="Sales hoạt động" value={activeSales} hint="Tài khoản Sales đang hoạt động" icon={<TeamOutlined />} loading={isLoadingUsers} />
        </Col>
      </Row>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)_minmax(260px,.7fr)]">
        <Card className="ceo-card" title="Doanh thu và lợi nhuận theo tháng">
          <div className="h-[286px]">
            {monthlyQueries.some((query) => query.isLoading) ? <Skeleton active paragraph={{ rows: 7 }} /> : <Line data={lineData} options={lineOptions} />}
          </div>
        </Card>

        <Card className="ceo-card" title="Cơ cấu chi phí theo dịch vụ">
          {costBreakdown.length ? (
            <>
              <div className="h-[190px]"><Doughnut data={costData} options={costOptions} /></div>
              <div className="mt-3 space-y-2">
                {costBreakdown.slice(0, 5).map((item, index) => (
                  <div key={item.categoryName} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-[var(--ceo-text-muted)]">
                      <i className="mr-2 inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: costData.datasets[0].backgroundColor[index] }} />
                      {item.categoryName}
                    </span>
                    <span className="shrink-0 font-semibold [font-variant-numeric:tabular-nums]">{formatCompactCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chi phí đã duyệt từ API" />
          )}
        </Card>

        <Card className="ceo-card" title="Hồ sơ theo trạng thái">
          <div className="space-y-1">
            {funnel.length ? funnel.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <div key={item.status} className="flex items-center justify-between border-b border-[var(--ceo-divider)] py-2.5 last:border-0">
                  <span className="text-sm text-[var(--ceo-text-muted)]">{meta.label}</span>
                  <span className="font-bold [font-variant-numeric:tabular-nums]" style={{ color: meta.color }}>{item.count}</span>
                </div>
              );
            }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ" />}
          </div>
          <Link href="/main/dossiers" className="mt-3 flex items-center justify-center gap-2 border-t border-[var(--ceo-divider)] pt-3 text-sm font-semibold text-[var(--ceo-primary-700)]">
            Xem hồ sơ toàn hệ thống <ArrowRightOutlined />
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <Card
          className="ceo-card"
          title="Hồ sơ toàn hệ thống - Cập nhật gần nhất"
          extra={<Button type="link" href="/main/dossiers">Xem tất cả</Button>}
        >
          <Table
            rowKey="id"
            dataSource={latestDossiers}
            columns={dossierColumns}
            loading={isLoadingDossiers}
            pagination={false}
            className="ceo-table"
            scroll={{ x: 930 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ từ API" /> }}
          />
        </Card>

        <Card className="ceo-card" title="Top khách hàng theo doanh thu">
          {overview?.vipCustomers?.length ? (
            <div className="space-y-1">
              {overview.vipCustomers.map((customer, index) => (
                <div key={`${customer.customerName}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--ceo-divider)] py-3 last:border-0">
                  <span className={`ceo-rank ceo-rank-${Math.min(index + 1, 3)}`}>{index + 1}</span>
                  <span className="truncate text-sm font-semibold">{customer.customerName}</span>
                  <span className="text-sm font-semibold text-[var(--ceo-primary-700)] [font-variant-numeric:tabular-nums]">{formatCompactCurrency(customer.spend)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có doanh thu khách hàng từ API" />
          )}
        </Card>
      </div>
    </div>
  );
}
