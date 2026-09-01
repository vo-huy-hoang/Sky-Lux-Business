'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Empty, Row, Select, Skeleton, Table, Typography } from 'antd';
import { DownloadOutlined, FileExcelOutlined, LineChartOutlined, PercentageOutlined, WalletOutlined } from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, ChartOptions, Legend, LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { dashboardsService } from '@/services/dashboards.service';
import { CeoDashboardData } from '@/types/dashboard';
import { useAuthStore } from '@/lib/stores/auth-store';
import OperatorRevenue from '@/components/operator/OperatorRevenue';
import { queryKeys } from '@/lib/query-keys';


ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LineElement, LinearScale, PointElement, Tooltip);
const { Text } = Typography;

function money(value?: number | null) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;
}

function compact(value?: number | null) {
  const number = value || 0;
  if (Math.abs(number) >= 1_000_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} tỷ`;
  if (Math.abs(number) >= 1_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000)} triệu`;
  return new Intl.NumberFormat('vi-VN').format(number);
}

function Metric({ label, value, icon, hint, loading }: { label: string; value: React.ReactNode; icon: React.ReactNode; hint: string; loading?: boolean }) {
  return <Card className="ceo-card ceo-metric-card h-full"><div className="flex items-start gap-3"><span className="ceo-metric-icon bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]">{icon}</span><div className="min-w-0"><Text className="text-xs text-[var(--ceo-text-muted)]">{label}</Text><div className="mt-1 truncate text-[21px] font-bold [font-variant-numeric:tabular-nums]">{loading ? <Skeleton.Input active size="small" /> : value}</div><div className="mt-2 truncate text-xs text-[var(--ceo-primary-600)]">{hint}</div></div></div></Card>;
}

function CeoRevenuePage() {
  const [anchorDate, setAnchorDate] = useState(dayjs());
  const year = anchorDate.year();
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ date: `${year}-${String(index + 1).padStart(2, '0')}-01`, label: `T${String(index + 1).padStart(2, '0')}` })), [year]);

  const currentMonth = useQuery({
    queryKey: queryKeys.dashboards.ceo({ periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') }),
    queryFn: () => dashboardsService.getCeoDashboard({ periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') }),
  });
  const currentQuarter = useQuery({
    queryKey: queryKeys.dashboards.ceo({ periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') }),
    queryFn: () => dashboardsService.getCeoDashboard({ periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') }),
  });
  const currentYear = useQuery({
    queryKey: queryKeys.dashboards.ceo({ periodType: 'YEARLY', date: `${year}-01-01` }),
    queryFn: () => dashboardsService.getCeoDashboard({ periodType: 'YEARLY', date: `${year}-01-01` }),
  });
  const monthlyQueries = useQueries({
    queries: months.map((month) => ({
      queryKey: queryKeys.dashboards.ceo({ periodType: 'MONTHLY', date: month.date }),
      queryFn: () => dashboardsService.getCeoDashboard({ periodType: 'MONTHLY', date: month.date }),
      staleTime: 5 * 60 * 1000,
    })),
  });


  const monthly = monthlyQueries.map((query) => query.data as CeoDashboardData | undefined);
  const monthData = currentMonth.data;
  const quarterData = currentQuarter.data;
  const yearData = currentYear.data;
  const monthCost = (monthData?.totalRevenue || 0) - (monthData?.totalProfit || 0);
  const margin = monthData?.totalRevenue ? ((monthData.totalProfit / monthData.totalRevenue) * 100).toFixed(1) : '0.0';
  const isLoading = currentMonth.isLoading || currentQuarter.isLoading || currentYear.isLoading;

  const trendData = {
    labels: months.map((month) => month.label),
    datasets: [
      { label: 'Doanh thu', data: monthly.map((item) => item?.totalRevenue || 0), borderColor: '#0F3D2E', backgroundColor: '#0F3D2E', tension: 0.35, pointRadius: 3 },
      { label: 'Lợi nhuận', data: monthly.map((item) => item?.totalProfit || 0), borderColor: '#D4AF37', backgroundColor: '#D4AF37', tension: 0.35, pointRadius: 3 },
    ],
  };
  const baseOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { align: 'start', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.parsed.y)}` } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#EEF1EF' }, ticks: { callback: (value) => compact(Number(value)) } } } };

  const vip = yearData?.vipCustomers || [];
  const vipData = { labels: vip.map((item) => item.customerName), datasets: [{ label: 'Doanh thu', data: vip.map((item) => item.spend), backgroundColor: '#0F3D2E', borderRadius: 3, barThickness: 24 }] };
  const barOptions: ChartOptions<'bar'> = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => money(context.parsed.x) } } }, scales: { x: { beginAtZero: true, border: { display: false }, grid: { color: '#EEF1EF' }, ticks: { callback: (value) => compact(Number(value)) } }, y: { grid: { display: false }, border: { display: false } } } };

  const cost = yearData?.costBreakdown || [];
  const costData = { labels: cost.map((item) => item.categoryName), datasets: [{ data: cost.map((item) => item.amount), backgroundColor: ['#0F3D2E', '#36785F', '#D4AF37', '#5B80C6', '#7C59C8', '#14A9B5'], borderColor: '#fff', borderWidth: 3 }] };
  const donutOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (context) => `${context.label}: ${money(context.parsed)}` } } } };

  const summaryRows = [
    { key: 'month', period: `Tháng ${anchorDate.format('MM/YYYY')}`, revenue: monthData?.totalRevenue || 0, profit: monthData?.totalProfit || 0 },
    { key: 'quarter', period: `Quý ${Math.floor(anchorDate.month() / 3) + 1}/${year}`, revenue: quarterData?.totalRevenue || 0, profit: quarterData?.totalProfit || 0 },
    { key: 'year', period: `Năm ${year}`, revenue: yearData?.totalRevenue || 0, profit: yearData?.totalProfit || 0 },
  ];

  return <div className="space-y-4">
    <div className="ceo-toolbar grid-cols-1 md:grid-cols-[220px_220px_1fr_auto_auto]">
      <DatePicker picker="month" value={anchorDate} onChange={(value) => value && setAnchorDate(value)} format="MM/YYYY" allowClear={false} aria-label="Kỳ báo cáo" />
      <Select value="ALL" options={[{ label: 'Tất cả mảng', value: 'ALL' }]} disabled aria-label="Mảng kinh doanh" />
      <div className="hidden md:block" />
      <Button icon={<DownloadOutlined />} disabled title="Chưa có API xuất PDF">Xuất PDF</Button>
      <Button icon={<FileExcelOutlined />} className="skylux-primary-button" disabled title="Chưa có API xuất Excel">Xuất Excel</Button>
    </div>

    <Row gutter={[12, 12]}>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Doanh thu tháng" value={money(monthData?.totalRevenue)} icon={<LineChartOutlined />} hint="Dự toán đã duyệt" loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Doanh thu quý" value={money(quarterData?.totalRevenue)} icon={<LineChartOutlined />} hint="Tổng quý hiện tại" loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Chi phí tháng" value={money(monthCost)} icon={<WalletOutlined />} hint="Doanh thu trừ lợi nhuận" loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Lợi nhuận tháng" value={money(monthData?.totalProfit)} icon={<LineChartOutlined />} hint="Dữ liệu được phê duyệt" loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Tỷ suất lợi nhuận" value={`${margin}%`} icon={<PercentageOutlined />} hint="Theo doanh thu tháng" loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Công nợ phải thu" value="-" icon={<WalletOutlined />} hint="Chưa có API công nợ" loading={false} /></Col>
    </Row>

    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.35fr_.9fr_.9fr]">
      <Card className="ceo-card" title="Doanh thu & lợi nhuận theo tháng"><div className="h-[300px]">{monthlyQueries.some((query) => query.isLoading) ? <Skeleton active /> : <Line data={trendData} options={baseOptions} />}</div></Card>
      <Card className="ceo-card" title="Top khách hàng theo doanh thu"><div className="h-[300px]">{vip.length ? <Bar data={vipData} options={barOptions} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu khách hàng" />}</div></Card>
      <Card className="ceo-card" title="Cơ cấu chi phí theo mảng"><div className="h-[300px]">{cost.length ? <Doughnut data={costData} options={donutOptions} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu chi phí" />}</div></Card>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <Card className="ceo-card" title="Tổng hợp theo kỳ báo cáo"><Table rowKey="key" dataSource={summaryRows} loading={isLoading} pagination={false} className="ceo-table" columns={[
        { title: 'Kỳ báo cáo', dataIndex: 'period' },
        { title: 'Doanh thu', dataIndex: 'revenue', align: 'right', render: money },
        { title: 'Chi phí', align: 'right', render: (_: unknown, item: typeof summaryRows[number]) => money(item.revenue - item.profit) },
        { title: 'Lợi nhuận', dataIndex: 'profit', align: 'right', render: (value: number) => <Text strong style={{ color: value >= 0 ? '#0A8A61' : '#DC3F46' }}>{money(value)}</Text> },
        { title: 'Biên lợi nhuận', align: 'right', render: (_: unknown, item: typeof summaryRows[number]) => `${item.revenue ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0'}%` },
      ]} /></Card>
      <Card className="ceo-card" title="Báo cáo nhanh"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API danh sách báo cáo nhanh" /><Button block href="/main/reports" className="skylux-outline-button">Mở trung tâm báo cáo</Button></Card>
    </div>
  </div>;
}

export default function RevenuePage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  return hasRole('OPERATOR') ? <OperatorRevenue /> : <CeoRevenuePage />;
}

