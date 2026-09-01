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
  TeamOutlined,
} from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
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
import { dossiersService } from '@/services/dossiers.service';
import { tasksService } from '@/services/tasks.service';
import { usersService } from '@/services/users.service';
import { estimatesService } from '@/services/estimates.service';
import { DossierItem } from '@/types/dossier';
import { EstimateItem } from '@/types/estimate';
import { TaskItem } from '@/types/task';
import { queryKeys } from '@/lib/query-keys';


ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, ChartTooltip, Legend);

const { Text } = Typography;

const statusMeta: Record<string, { label: string; color: string; className: string }> = {
  DRAFT: { label: 'Mới tiếp nhận', color: '#3487C8', className: 'op-status-info' },
  SUBMITTED: { label: 'Đã gửi', color: '#8462C7', className: 'op-status-purple' },
  IN_REVIEW: { label: 'Đang xử lý', color: '#D3A11B', className: 'op-status-warning' },
  APPROVED: { label: 'Đã duyệt', color: '#0B7A5B', className: 'op-status-valid' },
  COMPLETED: { label: 'Hoàn thành', color: '#075440', className: 'op-status-valid' },
  CANCELLED: { label: 'Đã hủy', color: '#D94A4A', className: 'op-status-danger' },
};

function getStatus(status?: string) {
  return statusMeta[status || ''] || { label: status || 'Chưa rõ', color: '#66706C', className: 'op-status-neutral' };
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '-';
}

function dailyRevenueSeries(estimates: EstimateItem[], dossiers: DossierItem[]) {
  const now = new Date();
  const days = Array.from({ length: now.getDate() }, (_, index) => index + 1);
  return days.map((day) => {
    const key = new Date(now.getFullYear(), now.getMonth(), day).toISOString().slice(0, 10);
    const revenue = estimates
      .filter((estimate) => estimate.createdAt?.slice(0, 10) === key)
      .reduce((sum, estimate) => sum + (estimate.revenueLines || []).reduce((lineTotal, line) => lineTotal + Number(line.netAmount || 0), 0), 0);
    const dossierCount = dossiers.filter((item) => item.createdAt?.slice(0, 10) === key).length;
    return { label: String(day).padStart(2, '0'), revenue, dossierCount };
  });
}

function MetricCard({ label, value, note, icon, tone = 'green' }: { label: string; value: React.ReactNode; note: string; icon: React.ReactNode; tone?: 'green' | 'gold' | 'orange' | 'blue' }) {
  return (
    <Card className="op-card op-kpi-card">
      <div className="flex items-center gap-4">
        <span className={`op-metric-icon op-metric-${tone}`}>{icon}</span>
        <div className="min-w-0">
          <Text className="text-sm text-[var(--op-text-muted)]">{label}</Text>
          <div className="mt-1 text-[28px] font-bold leading-none tabular-nums text-[var(--op-primary-900)]">{value}</div>
          <Text className="mt-2 block text-xs text-[var(--op-text-muted)]">{note}</Text>
        </div>
      </div>
    </Card>
  );
}

export default function OperatorDashboard() {

  const dossiersQuery = useQuery({ queryKey: queryKeys.dossiers.list({ page: 1, limit: 100 }), queryFn: () => dossiersService.getDossiers({ page: 1, limit: 100 }) });

  const tasksQuery = useQuery({ queryKey: queryKeys.tasks.list({ page: 1, limit: 100 }), queryFn: () => tasksService.getTasks({ page: 1, limit: 100 }) });
  const usersQuery = useQuery({ queryKey: queryKeys.users.list({ page: 1, pageSize: 100 }), queryFn: () => usersService.getUsers({ page: 1, pageSize: 100 }) });
  const estimatesQuery = useQuery({ queryKey: queryKeys.estimates.list({ page: 1, limit: 100 }), queryFn: () => estimatesService.getEstimates({ page: 1, limit: 100 }) });
  const [currentTimestamp] = React.useState(() => Date.now());

  const dossiers = useMemo(() => dossiersQuery.data?.items || [], [dossiersQuery.data?.items]);
  const tasks = useMemo(() => tasksQuery.data?.items || [], [tasksQuery.data?.items]);
  const users = useMemo(() => usersQuery.data?.data || [], [usersQuery.data?.data]);
  const newestEstimates = useMemo(() => Object.values((estimatesQuery.data?.items || []).reduce<Record<string, EstimateItem>>((result, estimate) => {
    const current = result[estimate.dossierId];
    if (!current || estimate.versionNo > current.versionNo) result[estimate.dossierId] = estimate;
    return result;
  }, {})), [estimatesQuery.data?.items]);
  const estimateDetails = useQueries({ queries: newestEstimates.map((estimate) => ({ queryKey: queryKeys.estimates.detail(estimate.id), queryFn: () => estimatesService.getEstimate(estimate.id), enabled: !!estimate.id })) });

  const estimatesWithLines = useMemo(() => estimateDetails.map((query) => query.data).filter((estimate): estimate is EstimateItem => !!estimate), [estimateDetails]);
  const activeSales = users.filter((user) => user.status === 'ACTIVE' && user.roles?.some((role) => role.code === 'SALES'));
  const statusCounts = useMemo(() => dossiers.reduce<Record<string, number>>((total, dossier) => {
    total[dossier.status] = (total[dossier.status] || 0) + 1;
    return total;
  }, {}), [dossiers]);
  const waitingCount = dossiers.filter((dossier) => ['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(dossier.status)).length;
  const needsChanges = dossiers.filter((dossier) => dossier.status === 'NEED_CHANGES').length;
  const series = useMemo(() => dailyRevenueSeries(estimatesWithLines, dossiers), [estimatesWithLines, dossiers]);
  const salesRank = useMemo(() => activeSales
    .map((user) => ({ user, dossiers: dossiers.filter((dossier) => dossier.salesUserId === user.id).length }))
    .sort((a, b) => b.dossiers - a.dossiers)
    .slice(0, 5), [activeSales, dossiers]);
  const urgentTasks = useMemo(() => tasks
    .filter((task) => task.status !== 'COMPLETED')
    .sort((a, b) => Number(b.priority === 'URGENT') - Number(a.priority === 'URGENT') || Number(b.priority === 'HIGH') - Number(a.priority === 'HIGH'))
    .slice(0, 5), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter((task) => task.status !== 'COMPLETED' && task.dueAt && new Date(task.dueAt).getTime() < currentTimestamp).length, [tasks, currentTimestamp]);
  const priorityDossiers = dossiers.filter((dossier) => ['HIGH', 'URGENT'].includes(dossier.priority || '')).length;

  const chartData = {
    labels: series.map((item) => item.label),
    datasets: [
      { type: 'bar' as const, label: 'Doanh thu (đ)', data: series.map((item) => item.revenue), backgroundColor: '#004230', borderRadius: 6, borderSkipped: false, barThickness: 18, yAxisID: 'revenue' },
      { type: 'line' as const, label: 'Số hồ sơ', data: series.map((item) => item.dossierCount), borderColor: '#D3A11B', backgroundColor: '#D3A11B', pointRadius: 3, pointHoverRadius: 5, tension: 0.35, borderWidth: 2.5, yAxisID: 'dossiers' },
    ],
  };
  const donutKeys = Object.keys(statusCounts);
  const donutData = { labels: donutKeys.map((key) => getStatus(key).label), datasets: [{ data: donutKeys.map((key) => statusCounts[key]), backgroundColor: donutKeys.map((key) => getStatus(key).color), borderWidth: 2, borderColor: '#FFFFFF', hoverOffset: 4 }] };
  const loading = dossiersQuery.isLoading || tasksQuery.isLoading || usersQuery.isLoading || estimatesQuery.isLoading || estimateDetails.some((query) => query.isLoading);
  const currentMonth = new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(new Date());
  const hasChartData = series.some((item) => item.revenue > 0 || item.dossierCount > 0);

  const dossierColumns = [
    { title: 'Mã hồ sơ', dataIndex: 'code', key: 'code', width: 130, render: (value: string) => <Text strong className="text-[var(--op-primary-900)]">{value}</Text> },
    { title: 'Sales', key: 'sales', width: 160, render: (_: unknown, record: DossierItem) => record.salesUser?.fullName || '-' },
    { title: 'Khách hàng', key: 'customer', render: (_: unknown, record: DossierItem) => record.customer?.displayName || '-' },
    { title: 'Ngày đi', dataIndex: 'startDate', key: 'startDate', width: 112, render: formatDate },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130, render: (value: string) => <Tag className={getStatus(value).className}>{getStatus(value).label}</Tag> },
  ];

  return (
    <div className="op-page space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Hồ sơ chờ xử lý" value={waitingCount} note="Từ danh sách hồ sơ" icon={<FolderOpenOutlined />} />
        <MetricCard label="Cần bổ sung" value={needsChanges} note="Theo trạng thái hồ sơ" icon={<ExclamationCircleOutlined />} tone="orange" />
        <MetricCard label="Doanh thu tháng này" value="-" note="API Điều hành chưa cung cấp doanh thu" icon={<BarChartOutlined />} tone="gold" />
        <MetricCard label="Sales đang hoạt động" value={activeSales.length} note="Từ dữ liệu người dùng" icon={<TeamOutlined />} tone="blue" />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.35fr_1fr_1.05fr]">
        <Card className="op-card" title={`Doanh thu theo ngày (tháng ${currentMonth})`} extra={<Button size="small" disabled> Theo ngày </Button>}>
          <div className="h-[306px]">{loading ? <Skeleton active paragraph={{ rows: 8 }} /> : hasChartData ? <Chart type="bar" data={chartData} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'start', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (context) => context.dataset.yAxisID === 'revenue' ? `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(Number(context.parsed.y || 0))} đ` : `${context.dataset.label}: ${Number(context.parsed.y || 0)}` } } }, scales: { x: { grid: { display: false }, border: { display: false } }, revenue: { beginAtZero: true, position: 'left', grid: { color: '#EEF0EF' }, border: { display: false }, ticks: { callback: (value) => `${Number(value) / 1_000_000}M` } }, dossiers: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, border: { display: false }, ticks: { precision: 0 } } } }} /> : <Empty description="Chưa có dữ liệu doanh thu từ dự toán" />}</div>
        </Card>
        <Card className="op-card" title="Tình trạng hồ sơ">
          <div className="relative h-[210px]">{loading ? <Skeleton active /> : donutKeys.length ? <><Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed} hồ sơ` } } } }} /><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><Text className="text-xs text-[var(--op-text-muted)]">Tổng hồ sơ</Text><strong className="text-3xl tabular-nums text-[var(--op-primary-900)]">{dossiersQuery.data?.total || dossiers.length}</strong></div></> : <Empty description="Chưa có trạng thái hồ sơ" />}</div>
          <div className="mt-3 space-y-2">{donutKeys.map((key) => <div key={key} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getStatus(key).color }} />{getStatus(key).label}</span><strong className="tabular-nums">{statusCounts[key]}</strong></div>)}</div>
        </Card>
        <Card className="op-card" title="KPI Sales theo hồ sơ" extra={<Link href="/main/sales">Xem quản lý Sales <RightOutlined /></Link>}>
          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : salesRank.length ? <div className="space-y-4">{salesRank.map(({ user, dossiers: count }, index) => <div key={user.id} className="flex items-center gap-3"><span className="op-rank">{index + 1}</span><Avatar size={32} src={user.avatarUrl}>{user.fullName.charAt(0)}</Avatar><div className="min-w-0 flex-1"><Text strong className="block truncate text-sm">{user.fullName}</Text><Text className="text-xs text-[var(--op-text-muted)]">{count} hồ sơ phụ trách</Text></div><strong className="tabular-nums text-[var(--op-primary-900)]">{count}</strong></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có Sales từ API" />}
        </Card>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[0.9fr_1.95fr_0.9fr]">
        <Card className="op-card" title="Việc cần xử lý hôm nay" extra={<Link href="/main/tasks">Xem tất cả <RightOutlined /></Link>}>
          {loading ? <Skeleton active /> : urgentTasks.length ? <div className="space-y-3">{urgentTasks.map((task: TaskItem) => <div key={task.id} className="op-compact-row"><ClockCircleOutlined className={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'text-[var(--op-danger)]' : 'text-[var(--op-gold-strong)]'} /><div className="min-w-0 flex-1"><Text strong className="block truncate text-sm">{task.title}</Text><Text className="text-xs text-[var(--op-text-muted)]">{task.dueAt ? `Hạn: ${formatDate(task.dueAt)}` : 'Chưa đặt hạn'}</Text></div><Tag className={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'op-status-danger' : 'op-status-warning'}>{task.priority === 'HIGH' || task.priority === 'URGENT' ? 'Cao' : 'Trung bình'}</Tag></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có công việc cần xử lý" />}
        </Card>
        <Card className="op-card" title="Hồ sơ gần đây" extra={<Link href="/main/dossiers">Xem tất cả <RightOutlined /></Link>}>
          <Table className="op-table" size="small" rowKey="id" dataSource={dossiers.slice(0, 6)} columns={dossierColumns} loading={loading} pagination={false} scroll={{ x: 760 }} />
        </Card>
        <Card className="op-card" title="Nhắc nhở vận hành">
          <div className="space-y-4"><div className="op-reminder"><CheckCircleOutlined /><div><Text strong>Quá hạn công việc</Text><Text className="block text-xs text-[var(--op-text-muted)]">{overdueTasks} công việc theo hạn xử lý</Text></div></div><div className="op-reminder"><ExclamationCircleOutlined /><div><Text strong>Ưu tiên xử lý</Text><Text className="block text-xs text-[var(--op-text-muted)]">{priorityDossiers} hồ sơ ưu tiên cao</Text></div></div><div className="op-reminder"><TeamOutlined /><div><Text strong>Nhà cung cấp</Text><Text className="block text-xs text-[var(--op-text-muted)]">Chưa có API tổng hợp nhà cung cấp</Text></div></div></div>
        </Card>
      </section>
    </div>
  );
}
