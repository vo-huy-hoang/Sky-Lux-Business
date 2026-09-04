'use client';

import React, { useMemo } from 'react';
import { Button, Card, Empty, Skeleton, Table, Tag, Typography } from 'antd';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FolderOpenOutlined, PieChartOutlined, RiseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { useOperatorSalesSummary, useOperatorMonthlyTrend } from '@/hooks/dashboards';

import { queryKeys } from '@/lib/query-keys';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const { Text } = Typography;
const statusTone = ['#004230', '#d3a11b', '#3487c8', '#8462c7', '#d94a4a'];
const statusLabels: Record<string, string> = { DRAFT: 'Mới tiếp nhận', SUBMITTED: 'Đã gửi', IN_REVIEW: 'Đang xử lý', NEED_CHANGES: 'Cần bổ sung', APPROVED: 'Đã duyệt', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };

function money(value?: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
}

function RevenueMetric({ label, value, note, icon, tone }: { label: string; value: React.ReactNode; note: string; icon: React.ReactNode; tone: 'green' | 'gold' | 'blue' | 'violet' }) {
  return <Card className="op-card op-kpi-card"><div className="flex items-center gap-4"><span className={`op-metric-icon op-metric-${tone === 'violet' ? 'blue' : tone}`}>{icon}</span><div className="min-w-0"><Text className="text-sm text-[var(--op-text-muted)]">{label}</Text><strong className="mt-1 block truncate text-[27px] leading-none text-[var(--op-primary-900)]">{value}</strong><Text className="mt-2 block text-xs text-[var(--op-text-muted)]">{note}</Text></div></div></Card>;
}

export default function OperatorRevenue() {
  const salesSummaryQuery = useOperatorSalesSummary();
  const monthlyTrendQuery = useOperatorMonthlyTrend(6);
  const dossiersQuery = useQuery({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 100 }),
    queryFn: ({ signal }) => dossiersService.getDossiers({ page: 1, limit: 100 }, { signal }),
  });

  const dossiers = useMemo(() => dossiersQuery.data?.items || [], [dossiersQuery.data?.items]);
  const statusCounts = useMemo(() => dossiers.reduce<Record<string, number>>((total, item) => ({ ...total, [item.status]: (total[item.status] || 0) + 1 }), {}), [dossiers]);

  const salesSummary = useMemo(() => salesSummaryQuery.data || [], [salesSummaryQuery.data]);
  const monthlyTrend = useMemo(() => monthlyTrendQuery.data || [], [monthlyTrendQuery.data]);

  const totalRevenue = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.totalRevenue || 0), 0), [salesSummary]);
  const totalProfit = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.totalProfit || 0), 0), [salesSummary]);
  const totalCompletedDossiers = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.approvedDossiers || 0), 0), [salesSummary]);
  const totalAllDossiers = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.totalDossiers || 0), 0), [salesSummary]);


  const loading = salesSummaryQuery.isLoading || monthlyTrendQuery.isLoading || dossiersQuery.isLoading;
  const donutKeys = Object.keys(statusCounts);
  const donut = { labels: donutKeys.map((status) => statusLabels[status] || status), datasets: [{ data: donutKeys.map((status) => statusCounts[status]), backgroundColor: donutKeys.map((_, index) => statusTone[index % statusTone.length]), borderColor: '#fff', borderWidth: 2, hoverOffset: 4 }] };
  const monthlyData = {
    labels: monthlyTrend.map((item) => item.label),
    datasets: [{ label: 'Hồ sơ tạo mới', data: monthlyTrend.map((item) => item.totalDossiers), backgroundColor: '#004230', borderRadius: 8, borderSkipped: false, maxBarThickness: 42 }],
  };
  const salesData = {
    labels: salesSummary.slice(0, 8).map((item) => item.salesUserName),
    datasets: [{ label: 'Hồ sơ phụ trách', data: salesSummary.slice(0, 8).map((item) => item.totalDossiers), backgroundColor: '#004230', borderRadius: 8, borderSkipped: false, maxBarThickness: 23 }],
  };

  const columns = [
    { title: '#', key: 'rank', width: 58, render: (_: unknown, __: unknown, index: number) => <span className="op-rank">{index + 1}</span> },
    { title: 'Sales', dataIndex: 'salesUserName', key: 'salesUserName', render: (value: string) => <Text strong>{value}</Text> },
    { title: 'Số hồ sơ', dataIndex: 'totalDossiers', key: 'totalDossiers', align: 'right' as const, render: (value: number) => <strong className="tabular-nums">{value}</strong> },
    { title: 'Doanh thu', dataIndex: 'totalRevenue', key: 'totalRevenue', align: 'right' as const, render: (value: number) => <span className="tabular-nums font-semibold">{money(value)}</span> },
    { title: 'Lợi nhuận', dataIndex: 'totalProfit', key: 'totalProfit', align: 'right' as const, render: (value: number) => <span className="tabular-nums text-emerald-700">{money(value)}</span> },
    { title: 'Hoàn tất', dataIndex: 'completionRate', key: 'completionRate', align: 'right' as const, render: (value: number) => <Tag className={value >= 70 ? 'op-status-valid' : 'op-status-warning'}>{value}%</Tag> },
  ];

  return (
    <div className="op-page space-y-4">
      <div className="op-report-toolbar">
        <div>
          <Text strong>Thời gian</Text>
          <Text className="mt-1 block text-xs text-[var(--op-text-muted)]">Dữ liệu tổng hợp từ hệ thống theo thời gian thực</Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<FileExcelOutlined />} disabled title="API xuất Excel chưa sẵn sàng">Xuất Excel</Button>
          <Button icon={<FilePdfOutlined />} disabled title="API xuất PDF chưa sẵn sàng">Xuất PDF</Button>
          <Button icon={<DownloadOutlined />} disabled title="API tải báo cáo chưa sẵn sàng">Tải báo cáo</Button>
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <RevenueMetric label="Tổng doanh thu" value={money(totalRevenue)} note="Tổng doanh thu hồ sơ đã duyệt" icon={<RiseOutlined />} tone="green" />
        <RevenueMetric label="Lợi nhuận ước tính" value={money(totalProfit)} note="Doanh thu trừ tổng chi phí" icon={<PieChartOutlined />} tone="gold" />
        <RevenueMetric label="Hồ sơ đã duyệt" value={totalCompletedDossiers} note="Hồ sơ đã được phê duyệt" icon={<FolderOpenOutlined />} tone="blue" />
        <RevenueMetric label="Tỷ lệ hoàn tất" value={totalAllDossiers ? `${Math.round((totalCompletedDossiers / totalAllDossiers) * 100)}%` : '—'} note="Hồ sơ đã duyệt / tổng hồ sơ" icon={<PieChartOutlined />} tone="violet" />
      </section>
      <section className="grid gap-4 2xl:grid-cols-3">
        <Card className="op-card" title="Hồ sơ tạo mới theo tháng">
          <div className="h-[286px]">
            {loading ? <Skeleton active /> : monthlyTrend.length ? <Bar data={monthlyData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 10, usePointStyle: true } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef0ef' }, border: { display: false } } } }} /> : <Empty description="Chưa có hồ sơ" />}
          </div>
        </Card>
        <Card className="op-card" title="Tình trạng hồ sơ">
          <div className="relative h-[206px]">
            {loading ? <Skeleton active /> : donutKeys.length ? <><Doughnut data={donut} options={{ responsive: true, maintainAspectRatio: false, cutout: '67%', plugins: { legend: { display: false } } }} /><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><Text className="text-xs text-[var(--op-text-muted)]">Tổng</Text><strong className="text-[28px] text-[var(--op-primary-900)]">{dossiersQuery.data?.total || dossiers.length}</strong><Text className="text-xs text-[var(--op-text-muted)]">hồ sơ</Text></div></> : <Empty description="Chưa có dữ liệu" />}
          </div>
          <div className="mt-3 space-y-2">
            {donutKeys.map((key, index) => <div key={key} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: statusTone[index % statusTone.length] }} />{statusLabels[key] || key}</span><strong>{statusCounts[key]}</strong></div>)}
          </div>
        </Card>
        <Card className="op-card" title="Hồ sơ theo Sales">
          <div className="h-[286px]">
            {loading ? <Skeleton active /> : salesSummary.length ? <Bar data={salesData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef0ef' }, border: { display: false } }, y: { grid: { display: false }, border: { display: false } } } }} /> : <Empty description="Chưa có Sales" />}
          </div>
        </Card>
      </section>
      <Card className="op-card" title="Bảng tổng hợp theo Sales">
        <Table className="op-table" rowKey="salesUserId" loading={loading} dataSource={salesSummary} columns={columns} pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 720 }} />
      </Card>
    </div>
  );
}

