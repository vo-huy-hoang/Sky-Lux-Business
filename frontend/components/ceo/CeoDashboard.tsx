'use client';

import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
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
import { UserItem } from '@/types/user';
import { CeoMonthlyTrendItem } from '@/types/dashboard';
import { useCeoDashboard, useCeoMonthlyTrend } from '@/hooks/dashboards';
import { useFilterStore } from '@/lib/stores/filter-store';
import { queryKeys } from '@/lib/query-keys';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';




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

  const selectedYear = useFilterStore((state) => state.selectedYear);

  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
  } = useCeoDashboard({ periodType: 'MONTHLY' });

  const { data: dossierResponse, isLoading: isLoadingDossiers } = useQuery<{ items: DossierItem[]; total: number }>({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 6 }),
    queryFn: ({ signal }) => dossiersService.getDossiers({ page: 1, limit: 6 }, { signal }),
  });

  const { data: userResponse, isLoading: isLoadingUsers } = useQuery<{ data: UserItem[] } | UserItem[]>({
    queryKey: queryKeys.users.list({ page: 1, pageSize: 50 }),
    queryFn: ({ signal }) => usersService.getUsers({ page: 1, pageSize: 50 }, { signal }),
  });

  const { data: monthlyTrend = [], isLoading: isLoadingTrend } = useCeoMonthlyTrend(selectedYear);


  const dossiers = dossierResponse?.items || [];
  const users: UserItem[] = Array.isArray(userResponse)
    ? userResponse
    : userResponse?.data || [];
  const activeSales = users.filter(
    (user: UserItem) => user.status === 'ACTIVE' && user.roles?.some((role: { code: string }) => role.code === 'SALES'),
  ).length;
  const funnel = overview?.funnel || [];
  const funnelMap = new Map<string, number>(funnel.map((item: { status: string; count: number }) => [item.status, item.count]));
  const totalDossiers = funnel.reduce((sum: number, item: { status: string; count: number }) => sum + item.count, 0);
  const pendingCount = (funnelMap.get('SUBMITTED') || 0) + (funnelMap.get('IN_REVIEW') || 0);
  const latestDossiers = dossiers.slice(0, 6);
  const costBreakdown = overview?.costBreakdown || [];

  const lineData = {
    labels: monthlyTrend.map((month: CeoMonthlyTrendItem) => month.label),
    datasets: [
      {
        label: 'Doanh thu',
        data: monthlyTrend.map((t: CeoMonthlyTrendItem) => t.totalRevenue),
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
        data: monthlyTrend.map((t: CeoMonthlyTrendItem) => t.totalProfit),
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
    labels: costBreakdown.map((item: { categoryName: string; amount: number }) => item.categoryName),
    datasets: [
      {
        data: costBreakdown.map((item: { categoryName: string; amount: number }) => item.amount),
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
        <WidgetErrorBoundary title="Doanh thu và lợi nhuận theo tháng">
          <Card className="ceo-card" title="Doanh thu và lợi nhuận theo tháng">
            <div className="h-[286px]">
              {isLoadingTrend ? <Skeleton active paragraph={{ rows: 7 }} /> : <Line data={lineData} options={lineOptions} />}
            </div>
          </Card>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Cơ cấu chi phí theo dịch vụ">
          <Card className="ceo-card" title="Cơ cấu chi phí theo dịch vụ">
            {costBreakdown.length ? (
              <>
                <div className="h-[190px]"><Doughnut data={costData} options={costOptions} /></div>
                <div className="mt-3 space-y-2">
                  {costBreakdown.slice(0, 5).map((item: { categoryName: string; amount: number }, index: number) => (
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
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Hồ sơ theo trạng thái">
          <Card className="ceo-card" title="Hồ sơ theo trạng thái">
            <div className="space-y-1">
              {funnel.length ? funnel.map((item: { status: string; count: number }) => {
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
        </WidgetErrorBoundary>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <WidgetErrorBoundary title="Hồ sơ toàn hệ thống - Cập nhật gần nhất">
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
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Top khách hàng theo doanh thu">
          <Card className="ceo-card" title="Top khách hàng theo doanh thu">
            {overview?.vipCustomers?.length ? (
              <div className="space-y-1">
                {overview.vipCustomers.map((customer: { customerName: string; spend: number }, index: number) => (
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
        </WidgetErrorBoundary>
      </div>

    </div>
  );
}
