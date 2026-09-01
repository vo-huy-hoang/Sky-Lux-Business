'use client';

import React, { useMemo } from 'react';
import { Avatar, Card, Empty, Progress, Skeleton, Table, Tag, Typography } from 'antd';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { CheckCircleOutlined, ExclamationCircleOutlined, FolderOpenOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { dossiersService } from '@/services/dossiers.service';
import { queryKeys } from '@/lib/query-keys';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
const { Text } = Typography;

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'green' | 'gold' | 'orange' | 'blue' }) {
  return <Card className="op-card op-kpi-card"><div className="flex items-center gap-4"><span className={`op-metric-icon op-metric-${tone}`}>{icon}</span><div><Text className="text-sm text-[var(--op-text-muted)]">{label}</Text><strong className="mt-1 block text-[28px] leading-none tabular-nums text-[var(--op-primary-900)]">{value}</strong></div></div></Card>;
}

export default function OperatorSalesPage() {
  const usersQuery = useQuery({ queryKey: queryKeys.users.list({ page: 1, pageSize: 100 }), queryFn: () => usersService.getUsers({ page: 1, pageSize: 100 }) });
  const dossiersQuery = useQuery({ queryKey: queryKeys.dossiers.list({ page: 1, limit: 100 }), queryFn: () => dossiersService.getDossiers({ page: 1, limit: 100 }) });

  const users = useMemo(() => usersQuery.data?.data || [], [usersQuery.data?.data]);
  const dossiers = useMemo(() => dossiersQuery.data?.items || [], [dossiersQuery.data?.items]);
  const sales = useMemo(() => users.filter((user) => user.roles?.some((role) => role.code === 'SALES')), [users]);
  const rows = useMemo(() => sales.map((user) => {
    const owned = dossiers.filter((dossier) => dossier.salesUserId === user.id);
    const pending = owned.filter((dossier) => ['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(dossier.status)).length;
    const complete = owned.filter((dossier) => ['APPROVED', 'COMPLETED'].includes(dossier.status)).length;
    const percent = owned.length ? Math.round((complete / owned.length) * 100) : 0;
    return { user, owned, pending, complete, percent };
  }).sort((a, b) => b.owned.length - a.owned.length), [sales, dossiers]);
  const isLoading = usersQuery.isLoading || dossiersQuery.isLoading;
  const supportCount = rows.filter((row) => row.pending > 0 && row.percent < 50).length;
  const chartData = { labels: rows.slice(0, 8).map((row) => row.user.fullName), datasets: [{ label: 'Hồ sơ phụ trách', data: rows.slice(0, 8).map((row) => row.owned.length), backgroundColor: '#004230', borderRadius: 6, borderSkipped: false, barThickness: 26 }] };

  const columns = [
    { title: 'Sales', key: 'sales', render: (_: unknown, row: typeof rows[number]) => <div className="flex items-center gap-3"><Avatar src={row.user.avatarUrl}>{row.user.fullName.charAt(0)}</Avatar><div><Text strong className="block">{row.user.fullName}</Text><Text className="text-xs text-[var(--op-text-muted)]">{row.user.email}</Text></div></div> },
    { title: 'Hồ sơ phụ trách', key: 'owned', align: 'right' as const, render: (_: unknown, row: typeof rows[number]) => <strong className="tabular-nums">{row.owned.length}</strong> },
    { title: 'Chờ xử lý', key: 'pending', align: 'right' as const, render: (_: unknown, row: typeof rows[number]) => <strong className="tabular-nums">{row.pending}</strong> },
    { title: 'Tỷ lệ hoàn tất', key: 'percent', width: 220, render: (_: unknown, row: typeof rows[number]) => <div className="flex items-center gap-2"><Progress percent={row.percent} size="small" showInfo={false} strokeColor="#0B7A5B" /><span className="w-10 tabular-nums text-xs">{row.percent}%</span></div> },
    { title: 'Trạng thái hỗ trợ', key: 'support', render: (_: unknown, row: typeof rows[number]) => <Tag className={row.pending > 0 && row.percent < 50 ? 'op-status-warning' : 'op-status-valid'}>{row.pending > 0 && row.percent < 50 ? 'Cần hỗ trợ' : 'Ổn định'}</Tag> },
  ];

  return <div className="op-page space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <Metric label="Tổng Sales" value={sales.length} icon={<TeamOutlined />} tone="green" />
      <Metric label="Đã hoàn tất hồ sơ" value={rows.reduce((sum, row) => sum + row.complete, 0)} icon={<CheckCircleOutlined />} tone="blue" />
      <Metric label="Cần hỗ trợ" value={supportCount} icon={<ExclamationCircleOutlined />} tone="orange" />
      <Metric label="Tổng hồ sơ từ Sales" value={rows.reduce((sum, row) => sum + row.owned.length, 0)} icon={<FolderOpenOutlined />} tone="gold" />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="op-card" title="KPI Sales theo hồ sơ"><div className="h-[310px]">{isLoading ? <Skeleton active /> : rows.length ? <Bar data={chartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.parsed.x} hồ sơ` } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF0EF' }, border: { display: false } }, y: { grid: { display: false }, border: { display: false } } } }} /> : <Empty description="Chưa có Sales từ API" />}</div></Card>
      <Card className="op-card" title="Doanh thu theo Sales"><div className="op-empty-panel h-[310px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="API Điều hành chưa cung cấp doanh thu theo Sales" /></div></Card>
    </div>
    <Card className="op-card" title="Danh sách Sales"><Table className="op-table" rowKey={(row) => row.user.id} loading={isLoading} dataSource={rows} columns={columns} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 900 }} /></Card>
  </div>;
}
