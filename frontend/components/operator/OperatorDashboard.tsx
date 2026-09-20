'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Avatar, Button, Card, Empty, Skeleton, Table, Tag, Typography } from 'antd';
import { Chart, Doughnut } from 'react-chartjs-2';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FolderOpenOutlined,
  RightOutlined,
  ShopOutlined,
} from '@ant-design/icons';

import { useQuery } from '@tanstack/react-query';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import {
  useOperatorDashboard,
  useOperatorMonthlyTrend,
  useOperatorSalesSummary,
} from '@/hooks/dashboards';
import { useDossiersList } from '@/hooks/dossiers';
import { tasksService } from '@/services/tasks.service';
import { DossierItem } from '@/types/dossier';
import { TaskItem } from '@/types/task';
import { OperatorMonthlyTrendItem } from '@/types/dashboard';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/financial-calculations';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, ChartTooltip, Legend);

const { Text } = Typography;

const statusMeta: Record<string, { label: string; color: string; className: string }> = {
  DRAFT: { label: 'Mới tiếp nhận', color: '#3487C8', className: 'op-status-info' },
  SUBMITTED: { label: 'Đã gửi duyệt', color: '#8462C7', className: 'op-status-purple' },
  IN_REVIEW: { label: 'Đang xử lý', color: '#D3A11B', className: 'op-status-warning' },
  APPROVED: { label: 'Đã duyệt', color: '#0B7A5B', className: 'op-status-valid' },
  COMPLETED: { label: 'Hoàn thành', color: '#075440', className: 'op-status-valid' },
  CANCELLED: { label: 'Đã hủy', color: '#D94A4A', className: 'op-status-danger' },
  NEED_CHANGES: { label: 'Cần bổ sung', color: '#FF7A45', className: 'op-status-warning' },
};

function getStatus(status?: string) {
  return statusMeta[status || ''] || { label: status || 'Chưa rõ', color: '#66706C', className: 'op-status-neutral' };
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '-';
}

function formatMoney(value?: number) {
  return formatCurrency(value);
}

function formatCompactRevenue(value?: number | string) {
  return formatCurrency(value, { compact: true, showSymbol: false });
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone = 'green',
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  icon: React.ReactNode;
  tone?: 'green' | 'gold' | 'orange' | 'blue';
}) {
  return (
    <Card className="op-card op-kpi-card">
      <div className="flex items-center gap-4">
        <span className={`op-metric-icon op-metric-${tone}`}>{icon}</span>
        <div className="min-w-0">
          <Text className="text-sm text-[var(--op-text-muted)]">{label}</Text>
          <div className="mt-1 text-[28px] font-bold leading-none tabular-nums text-[var(--op-primary-900)]">
            {value}
          </div>
          <Text className="mt-2 block text-xs text-[var(--op-text-muted)]">{note}</Text>
        </div>
      </div>
    </Card>
  );
}

export default function OperatorDashboard() {
  // 1. Tiêu thụ 3 API Aggregations từ Backend (Siêu nhanh & có Cache)
  const { data: operatorData, isLoading: isLoadingOperator } = useOperatorDashboard();
  const { data: monthlyTrends = [], isLoading: isLoadingTrend } = useOperatorMonthlyTrend(6);
  const { data: salesSummary = [], isLoading: isLoadingSales } = useOperatorSalesSummary();

  // 2. Lấy 5 hồ sơ gần nhất & 5 việc khẩn cấp (Giới hạn limit: 5 thay vì 100)
  const { data: recentDossiersResponse, isLoading: isLoadingDossiers } = useDossiersList({
    page: 1,
    limit: 6,
  });
  const recentDossiers = recentDossiersResponse?.data || [];

  const { data: urgentTasksResponse, isLoading: isLoadingTasks } = useQuery({
    queryKey: queryKeys.tasks.list({ page: 1, limit: 5, status: 'IN_PROGRESS' }),
    queryFn: ({ signal }) => tasksService.getTasks({ page: 1, limit: 5, status: 'IN_PROGRESS' }, { signal }),
  });
  const urgentTasks = urgentTasksResponse?.data || [];

  // 3. Tính toán các chỉ số thống kê từ dữ liệu backend tổng hợp
  const totalMonthRevenue = useMemo(() => {
    if (!monthlyTrends.length) return 0;
    const latestMonth = monthlyTrends[monthlyTrends.length - 1];
    return latestMonth?.totalRevenue || 0;
  }, [monthlyTrends]);

  const activeDossiers = operatorData?.activeDossiersCount || 0;
  const overdueTasks = operatorData?.overdueTasksCount || 0;
  const totalSuppliers = operatorData?.totalSuppliers || 0;
  const priorityDossiers = useMemo(() => {
    return (
      operatorData?.priorityBreakdown
        ?.filter((p: { priority: string; count: number }) => ['HIGH', 'URGENT'].includes(p.priority))
        ?.reduce((sum: number, p: { priority: string; count: number }) => sum + p.count, 0) || 0
    );
  }, [operatorData?.priorityBreakdown]);

  // Top 5 Sales theo doanh thu và hồ sơ
  const topSalesRank = useMemo(() => {
    return [...salesSummary]
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalDossiers - a.totalDossiers)
      .slice(0, 5);
  }, [salesSummary]);

  // Biểu đồ Xu hướng doanh thu & Hồ sơ 6 tháng gần nhất
  const chartData = useMemo(() => {
    return {
      labels: monthlyTrends.map((t: OperatorMonthlyTrendItem) => t.label || t.monthKey),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Doanh thu (đ)',
          data: monthlyTrends.map((t: OperatorMonthlyTrendItem) => t.totalRevenue),
          backgroundColor: '#004230',
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 22,
          yAxisID: 'revenue',
        },
        {
          type: 'line' as const,
          label: 'Hồ sơ đã duyệt',
          data: monthlyTrends.map((t: OperatorMonthlyTrendItem) => t.approvedDossiers),
          borderColor: '#D3A11B',
          backgroundColor: '#D3A11B',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          borderWidth: 2.5,
          yAxisID: 'dossiers',
        },
      ],
    };
  }, [monthlyTrends]);

  // Biểu đồ Trạng thái công việc / Phân bố độ ưu tiên
  const donutData = useMemo(() => {
    const tasksBreakdown = operatorData?.tasksBreakdown || [];
    return {
      labels: tasksBreakdown.map((t: { status: string; count: number }) => t.status),
      datasets: [
        {
          data: tasksBreakdown.map((t: { status: string; count: number }) => t.count),
          backgroundColor: ['#D3A11B', '#3487C8', '#0B7A5B', '#D94A4A', '#8462C7'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 4,
        },
      ],
    };
  }, [operatorData?.tasksBreakdown]);

  const loading =
    isLoadingOperator ||
    isLoadingTrend ||
    isLoadingSales ||
    isLoadingDossiers ||
    isLoadingTasks;

  const currentMonth = new Intl.DateTimeFormat('vi-VN', {
    month: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const hasChartData = monthlyTrends.some((item: OperatorMonthlyTrendItem) => item.totalRevenue > 0 || item.totalDossiers > 0);

  const dossierColumns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 280,
      render: (value: string, record: DossierItem) => (
        <Link href={`/main/dossiers/${record.id}`}>
          <Text strong className="text-[var(--op-primary-900)] hover:underline whitespace-nowrap">
            {value}
          </Text>
        </Link>
      ),
    },
    {
      title: 'Sales phụ trách',
      key: 'sales',
      width: 160,
      render: (_: unknown, record: DossierItem) => record.salesUser?.fullName || '-',
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_: unknown, record: DossierItem) => (
        <span className="truncate block" title={record.customer?.displayName || '-'}>
          {record.customer?.displayName || '-'}
        </span>
      ),
    },
    {
      title: 'Ngày đi',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 112,
      render: formatDate,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: string) => (
        <Tag className={getStatus(value).className}>{getStatus(value).label}</Tag>
      ),
    },
  ];

  return (
    <div className="op-page space-y-4">
      {/* 1. THẺ KPI TỔNG QUAN */}
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Hồ sơ đang xử lý"
          value={activeDossiers}
          note="Tổng số hồ sơ đang vận hành"
          icon={<FolderOpenOutlined />}
        />
        <MetricCard
          label="Ưu tiên cao / Khẩn cấp"
          value={priorityDossiers}
          note="Cần xử lý gấp"
          icon={<ExclamationCircleOutlined />}
          tone="orange"
        />
        <MetricCard
          label="Doanh thu tháng này"
          value={formatMoney(totalMonthRevenue)}
          note={`Doanh thu ghi nhận ${currentMonth}`}
          icon={<BarChartOutlined />}
          tone="gold"
        />
        <MetricCard
          label="Nhà cung cấp đối tác"
          value={totalSuppliers}
          note="Hệ thống đối tác cung ứng"
          icon={<ShopOutlined />}
          tone="blue"
        />
      </section>

      {/* 2. BIỂU ĐỒ & BẢNG XẾP HẠNG */}
      <section className="grid gap-4 2xl:grid-cols-[1.35fr_1fr_1.05fr]">
        <Card
          className="op-card"
          title={`Xu hướng Doanh thu & Hồ sơ (6 tháng gần nhất)`}
          extra={
            <Button size="small" type="dashed">
              Theo tháng
            </Button>
          }
        >
          <div className="h-[306px]">
            {loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : hasChartData ? (
              <Chart
                type="bar"
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      position: 'top',
                      align: 'start',
                      labels: { usePointStyle: true, boxWidth: 8 },
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) =>
                          context.dataset.yAxisID === 'revenue'
                            ? `${context.dataset.label}: ${formatCurrency(Number(context.parsed.y || 0))}`
                            : `${context.dataset.label}: ${Number(context.parsed.y || 0)} hồ sơ`,
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, border: { display: false } },
                    revenue: {
                      beginAtZero: true,
                      min: 0,
                      suggestedMax: 10_000_000,
                      position: 'left',
                      grid: { color: '#EEF0EF' },
                      border: { display: false },
                      ticks: {
                        callback: (value) => formatCompactRevenue(value),
                      },
                    },
                    dossiers: {
                      beginAtZero: true,
                      min: 0,
                      suggestedMax: 5,
                      position: 'right',
                      grid: { drawOnChartArea: false },
                      border: { display: false },
                      ticks: {
                        precision: 0,
                        callback: (value) => `${value}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <Empty description="Chưa có dữ liệu doanh thu từ hệ thống" />
            )}
          </div>
        </Card>

        <Card className="op-card" title="Phân bổ Công việc Vận hành">
          <div className="relative h-[210px]">
            {loading ? (
              <Skeleton active />
            ) : (operatorData?.tasksBreakdown?.length || 0) > 0 ? (
              <>
                <Doughnut
                  data={donutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.label}: ${context.parsed} công việc`,
                        },
                      },
                    },
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <Text className="text-xs text-[var(--op-text-muted)]">Tổng công việc</Text>
                  <strong className="text-3xl tabular-nums text-[var(--op-primary-900)]">
                    {operatorData?.tasksBreakdown?.reduce((sum: number, t: { status: string; count: number }) => sum + t.count, 0) || 0}
                  </strong>
                </div>
              </>
            ) : (
              <Empty description="Chưa có dữ liệu công việc" />
            )}
          </div>
          <div className="mt-3 space-y-2">
            {operatorData?.tasksBreakdown?.map((task: { status: string; count: number }, idx: number) => (
              <div key={task.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <i
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: ['#D3A11B', '#3487C8', '#0B7A5B', '#D94A4A', '#8462C7'][
                        idx % 5
                      ],
                    }}
                  />
                  {task.status}
                </span>
                <strong className="tabular-nums">{task.count}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card
          className="op-card"
          title="Top Sales theo Hiệu suất"
          extra={
            <Link href="/main/sales">
              Xem chi tiết <RightOutlined />
            </Link>
          }
        >
          {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : topSalesRank.length ? (
            <div className="space-y-4">
              {topSalesRank.map((sales, index) => (
                <div key={sales.salesUserId} className="flex items-center gap-3">
                  <span className="op-rank">{index + 1}</span>
                  <Avatar size={32} style={{ backgroundColor: '#004230' }}>
                    {sales.salesUserName.charAt(0)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Text strong className="block truncate text-sm">
                      {sales.salesUserName}
                    </Text>
                    <Text className="text-xs text-[var(--op-text-muted)]">
                      {sales.totalDossiers} hồ sơ • {formatMoney(sales.totalRevenue)}
                    </Text>
                  </div>
                  <strong className="tabular-nums text-xs text-[#0B7A5B]">
                    {sales.completionRate ? `${sales.completionRate}%` : `${sales.approvedDossiers} duyệt`}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu Sales" />
          )}
        </Card>
      </section>

      {/* 3. BẢNG HỒ SƠ GẦN ĐÂY & NHẮC NHỞ */}
      <section className="grid gap-4 2xl:grid-cols-[0.9fr_1.95fr_0.9fr]">
        <Card
          className="op-card"
          title="Việc cần xử lý hôm nay"
          extra={
            <Link href="/main/tasks">
              Xem tất cả <RightOutlined />
            </Link>
          }
        >
          {loading ? (
            <Skeleton active />
          ) : urgentTasks.length ? (
            <div className="space-y-3">
              {urgentTasks.map((task: TaskItem) => (
                <div key={task.id} className="op-compact-row">
                  <ClockCircleOutlined
                    className={
                      task.priority === 'HIGH' || task.priority === 'URGENT'
                        ? 'text-[var(--op-danger)]'
                        : 'text-[var(--op-gold-strong)]'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Text strong className="block truncate text-sm">
                      {task.title}
                    </Text>
                    <Text className="text-xs text-[var(--op-text-muted)]">
                      {task.dueAt ? `Hạn: ${formatDate(task.dueAt)}` : 'Chưa đặt hạn'}
                    </Text>
                  </div>
                  <Tag
                    className={
                      task.priority === 'HIGH' || task.priority === 'URGENT'
                        ? 'op-status-danger'
                        : 'op-status-warning'
                    }
                  >
                    {task.priority === 'HIGH' || task.priority === 'URGENT' ? 'Cao' : 'Trung bình'}
                  </Tag>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có công việc cần xử lý" />
          )}
        </Card>

        <Card
          className="op-card"
          title="Hồ sơ gần đây"
          extra={
            <Link href="/main/dossiers">
              Xem tất cả <RightOutlined />
            </Link>
          }
        >
          <Table
            className="op-table"
            size="small"
            rowKey="id"
            dataSource={recentDossiers}
            columns={dossierColumns}
            loading={loading}
            pagination={false}
            scroll={{ x: 920 }}
          />
        </Card>

        <Card className="op-card" title="Nhắc nhở vận hành">
          <div className="space-y-4">
            <div className="op-reminder">
              <CheckCircleOutlined />
              <div>
                <Text strong>Quá hạn công việc</Text>
                <Text className="block text-xs text-[var(--op-text-muted)]">
                  {overdueTasks} công việc cần đôn đốc hạn xử lý
                </Text>
              </div>
            </div>
            <div className="op-reminder">
              <ExclamationCircleOutlined />
              <div>
                <Text strong>Ưu tiên xử lý</Text>
                <Text className="block text-xs text-[var(--op-text-muted)]">
                  {priorityDossiers} hồ sơ mức độ ưu tiên cao
                </Text>
              </div>
            </div>
            <div className="op-reminder">
              <ShopOutlined />
              <div>
                <Text strong>Mạng lưới đối tác</Text>
                <Text className="block text-xs text-[var(--op-text-muted)]">
                  {totalSuppliers} nhà cung cấp đang sẵn sàng
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
