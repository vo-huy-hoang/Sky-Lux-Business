'use client';

import React from 'react';
import { Button, Card, Col, DatePicker, Empty, Row, Select, Skeleton, Table, Typography } from 'antd';

import { DownloadOutlined, FileExcelOutlined, LineChartOutlined, PercentageOutlined, WalletOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, ChartOptions, Legend, LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { dashboardsService } from '@/services/dashboards.service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFilterStore } from '@/lib/stores/filter-store';
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
  const dateString = useFilterStore((state) => state.dateString);
  const setDateString = useFilterStore((state) => state.setDateString);
  const anchorDate = dayjs(dateString);
  const year = anchorDate.year();


  const currentMonth = useQuery({
    queryKey: queryKeys.dashboards.ceo({ periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') }),
    queryFn: ({ signal }) =>
      dashboardsService.getCeoDashboard(
        { periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') },
        { signal },
      ),
  });
  const currentQuarter = useQuery({
    queryKey: queryKeys.dashboards.ceo({ periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') }),
    queryFn: ({ signal }) =>
      dashboardsService.getCeoDashboard(
        { periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') },
        { signal },
      ),
  });
  const currentYear = useQuery({
    queryKey: queryKeys.dashboards.ceo({ periodType: 'YEARLY', date: `${year}-01-01` }),
    queryFn: ({ signal }) =>
      dashboardsService.getCeoDashboard(
        { periodType: 'YEARLY', date: `${year}-01-01` },
        { signal },
      ),
  });
  const monthlyTrendQuery = useQuery({
    queryKey: queryKeys.dashboards.ceoMonthlyTrend(year),
    queryFn: ({ signal }) => dashboardsService.getCeoMonthlyTrend(year, { signal }),
  });

  const monthlyTrend = monthlyTrendQuery.data || [];
  const monthData = currentMonth.data;
  const quarterData = currentQuarter.data;
  const yearData = currentYear.data;
  const monthCost = (monthData?.totalRevenue || 0) - (monthData?.totalProfit || 0);
  const margin = monthData?.totalRevenue ? ((monthData.totalProfit / monthData.totalRevenue) * 100).toFixed(1) : '0.0';
  const isLoading = currentMonth.isLoading || currentQuarter.isLoading || currentYear.isLoading || monthlyTrendQuery.isLoading;

  const trendData = {
    labels: monthlyTrend.map((item) => item.label),
    datasets: [
      { label: 'Doanh thu', data: monthlyTrend.map((item) => item.totalRevenue), borderColor: '#0F3D2E', backgroundColor: '#0F3D2E', tension: 0.35, pointRadius: 3 },
      { label: 'Lợi nhuận', data: monthlyTrend.map((item) => item.totalProfit), borderColor: '#D4AF37', backgroundColor: '#D4AF37', tension: 0.35, pointRadius: 3 },
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
      <DatePicker picker="month" value={anchorDate} onChange={(value) => value && setDateString(value.format('YYYY-MM-DD'))} format="MM/YYYY" allowClear={false} aria-label="Kỳ báo cáo" />
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
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Thời gian chốt HSYC trung bình" value="-" icon={<WalletOutlined />} hint="Chưa có API công nợ" loading={false} /></Col>
    </Row>

    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.35fr_.9fr_.9fr]">
      <Card className="ceo-card" title="Doanh thu & lợi nhuận theo tháng"><div className="h-[300px]">{monthlyTrendQuery.isLoading ? <Skeleton active /> : <Line data={trendData} options={baseOptions} />}</div></Card>
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


      message.success({ content: 'Đã xuất file Excel Báo cáo Doanh thu & Thống kê!', key: 'export-excel' });
    }, 1000);
  };

  
  const formatMoney = (val: number) => {
    if (!val) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };
  const formatTyg = (val: number) => {
    return (val / 1_000_000_000).toFixed(2);
  };

  // KPI calculations
  const currentMonthRev = monthData?.totalRevenue || 0;
  const currentMonthProfit = monthData?.totalProfit || 0;
  const currentMonthCost = currentMonthRev - currentMonthProfit;
  const currentMonthMargin = currentMonthRev > 0 ? (currentMonthProfit / currentMonthRev) * 100 : 0;
  
  const currentQuarterRev = quarterData?.totalRevenue || 0;
  const avgDays = monthData?.avgDossierClosingDays || 0;

  // Monthly trend for line chart
  const monthlyLabels = monthlyTrend.map(t => t.label);
  const chartRevenue = monthlyTrend.map(t => Number(t.totalRevenue) / 1_000_000_000);
  const chartProfit = monthlyTrend.map(t => Number(t.totalProfit) / 1_000_000_000);

  const lineChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: chartRevenue,
        borderColor: '#104E35',
        backgroundColor: '#104E35',
        tension: 0.35,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#104E35',
        pointBorderWidth: 2,
      },
      {
        label: 'Lợi nhuận (đ)',
        data: chartProfit,
        borderColor: '#D48B1E',
        backgroundColor: '#D48B1E',
        tension: 0.35,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#D48B1E',
        pointBorderWidth: 2,
      },
    ],
  };

  // Sales Bar Data
  const topSales = [...salesSummary].sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue)).slice(0, 7);
  const salesBarData = {
    labels: topSales.map(s => s.salesUserName),
    datasets: [
      {
        label: 'Doanh thu (Tỷ)',
        data: topSales.map(s => Number(s.totalRevenue) / 1_000_000_000),
        backgroundColor: '#104E35',
        hoverBackgroundColor: '#0B3A27',
        borderRadius: 3.5,
        barThickness: 18,
      },
    ],
  };
  const maxSalesValue = topSales.length > 0 ? Math.max(...topSales.map(s => Number(s.totalRevenue) / 1_000_000_000)) : 25;

  // Top Customers
  const customerColors = [
    { badgeBg: 'bg-[#FEF3C7] text-[#D97706]', logoBg: 'bg-[#F97316] text-white' },
    { badgeBg: 'bg-[#DBEAFE] text-[#2563EB]', logoBg: 'bg-[#0284C7] text-white' },
    { badgeBg: 'bg-[#FEF3C7] text-[#92400E]', logoBg: 'bg-[#059669] text-white' },
    { badgeBg: 'bg-slate-100 text-slate-500', logoBg: 'bg-[#E11D48] text-white' },
    { badgeBg: 'bg-slate-100 text-slate-500', logoBg: 'bg-[#1E293B] text-white' },
  ];
  const topCustomers = (monthData?.vipCustomers || []).slice(0, 5).map((c, i) => ({
    rank: i + 1,
    name: c.customerName,
    value: Number(c.spend) / 1_000_000_000,
    badgeBg: customerColors[i % customerColors.length].badgeBg,
    logoLetter: c.customerName.charAt(0).toUpperCase(),
    logoBg: customerColors[i % customerColors.length].logoBg,
  }));

  // Market Table
  const marketRows = (monthData?.marketBreakdown || []).map((m, i) => ({
    key: String(i),
    market: m.marketName,
    dossiers: m.dossiers.toLocaleString(),
    revenue: (Number(m.revenue) / 1_000_000_000).toFixed(2),
    profit: (Number(m.profit) / 1_000_000_000).toFixed(2),
    share: currentMonthRev > 0 ? ((Number(m.revenue) / currentMonthRev) * 100).toFixed(1) + '%' : '0%',
  }));

  // Donut Chart data
  const revenueBreakdown = monthData?.revenueBreakdown || [];
  const totalBreakdown = revenueBreakdown.reduce((sum, b) => sum + Number(b.amount), 0);
  const sortedBreakdown = [...revenueBreakdown].sort((a, b) => Number(b.amount) - Number(a.amount));
  const donutColors = ['#104E35', '#2C7459', '#D48B1E', '#5B80C6', '#7C59C8'];
  let currentAngle = 0;
  const donutSlices = sortedBreakdown.map((item, i) => {
    const amount = Number(item.amount);
    const percentage = totalBreakdown > 0 ? (amount / totalBreakdown) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = startAngle + angle / 2;
    currentAngle = endAngle;
    return {
      name: item.businessLineName,
      amount,
      percentage,
      startAngle,
      endAngle,
      midAngle,
      color: donutColors[i % donutColors.length],
    };
  });


  const salesBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (ctx) => ` Doanh thu: ${ctx.parsed.y}B`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#334155',
          font: { size: 9 },
          maxRotation: 40,
          minRotation: 35,
          autoSkip: false,
        },
      },
      y: {
        min: 0,
        max: Math.ceil(maxSalesValue / 5) * 5,
        grid: { color: '#F1F5F9' },
        border: { display: false },
        ticks: {
          color: '#64748B',
          font: { size: 9.5 },
          stepSize: 5,
          callback: (value) => (value === 0 ? '0' : `${value}B`),
        },
      },
    },
  };

  // Quick Reports List
  const quickReports = [
    {
      id: '1',
      title: 'Báo cáo doanh thu chi tiết',
      icon: <FileTextOutlined className="text-sm" />,
      iconBox: 'bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5]',
      href: '/main/reports',
    },
    {
      id: '2',
      title: 'Báo cáo lợi nhuận theo mảng',
      icon: <DollarOutlined className="text-sm" />,
      iconBox: 'bg-[#FEF5E7] text-[#D97706] border border-[#FDE3B8]',
      href: '/main/reports',
    },
    {
      id: '3',
      title: 'Báo cáo công nợ phải thu',
      icon: <WalletOutlined className="text-sm" />,
      iconBox: 'bg-[#EBF5FB] text-[#2E82C4] border border-[#D1E8F7]',
      href: '/main/reports',
    },
    {
      id: '4',
      title: 'Báo cáo theo thị trường',
      icon: <GlobalOutlined className="text-sm" />,
      iconBox: 'bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5]',
      href: '/main/reports',
    },
    {
      id: '5',
      title: 'Báo cáo hiệu suất Sales',
      icon: <BarChartOutlined className="text-sm" />,
      iconBox: 'bg-[#E6F8F6] text-[#0D9488] border border-[#CCF0ED]',
      href: '/main/kpi',
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* 1. FILTER TOOLBAR & EXPORT BUTTONS */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* 4 Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-1 max-w-4xl">
            {/* Filter 1: Kỳ báo cáo */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarOutlined className="text-slate-400 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 leading-none">Kỳ báo cáo</div>
                  <div className="font-semibold text-slate-800 text-xs truncate mt-0.5">
                    {reportPeriod}
                  </div>
                </div>
              </div>
              <DownOutlined className="text-[9px] text-slate-400 shrink-0 ml-1.5" />
            </div>

            {/* Filter 2: Mảng */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <AppstoreOutlined className="text-slate-400 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 leading-none">Mảng</div>
                  <div className="font-semibold text-slate-800 text-xs truncate mt-0.5">
                    {businessLine}
                  </div>
                </div>
              </div>
              <DownOutlined className="text-[9px] text-slate-400 shrink-0 ml-1.5" />
            </div>

            {/* Filter 3: Thị trường */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs">
              <div className="flex items-center gap-2 min-w-0">
            </Card>
          </WidgetErrorBoundary>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <WidgetErrorBoundary title="Tình trạng công việc">
            <Card
              className="skylux-card h-full"
              title={<span className="font-bold text-slate-900">Tình trạng công việc</span>}
            >
            </div>

            {/* Filter 4: Sales */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <TeamOutlined className="text-slate-400 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 leading-none">Sales</div>
                  <div className="font-semibold text-slate-800 text-xs truncate mt-0.5">
                    {salesFilter}
                  </div>
                </div>
              </div>
              <DownOutlined className="text-[9px] text-slate-400 shrink-0 ml-1.5" />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 justify-end">
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#0B7A5B] bg-white text-[#0B7A5B] text-xs font-semibold hover:bg-[#E8F6ED] transition-colors cursor-pointer"
            >
              <FilePdfOutlined className="text-sm" />
              <span>Xuất PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <FileExcelOutlined className="text-sm" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SIX EXECUTIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Metric 1: Doanh thu tháng */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0">
              <LineChartOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Doanh thu tháng</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
                {formatMoney(currentMonthRev)} đ
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-[#0A8A61] flex items-center gap-1 whitespace-nowrap">
            <span>↑ 0%</span>
            <span className="text-slate-400 font-normal">so với tháng trước</span>
          </div>
        </div>

        {/* Metric 2: Doanh thu quý */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0">
              <CalendarOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Doanh thu quý</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
                {formatMoney(currentQuarterRev)} đ
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-[#0A8A61] flex items-center gap-1 whitespace-nowrap">
            <span>↑ 0%</span>
            <span className="text-slate-400 font-normal">so với quý trước</span>
          </div>
        </div>

        {/* Metric 3: Chi phí */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FEF5E7] text-[#D97706] border border-[#FDE3B8] flex items-center justify-center shrink-0">
              <WalletOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Chi phí</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
                {formatMoney(currentMonthCost)} đ
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-[#0A8A61] flex items-center gap-1 whitespace-nowrap">
            <span>↑ 0%</span>
            <span className="text-slate-400 font-normal">so với tháng trước</span>
          </div>
        </div>

        {/* Metric 4: Lợi nhuận */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0">
              <RiseOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Lợi nhuận</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
                {formatMoney(currentMonthProfit)} đ
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-[#0A8A61] flex items-center gap-1 whitespace-nowrap">
            <span>↑ 0%</span>
            <span className="text-slate-400 font-normal">so với tháng trước</span>
          </div>
        </div>

        {/* Metric 5: Tỷ suất lợi nhuận */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0">
              <PercentageOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Tỷ suất lợi nhuận</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
                {currentMonthMargin.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-[#0A8A61] flex items-center gap-1 whitespace-nowrap">
            <span>↑ 0 điểm %</span>
            <span className="text-slate-400 font-normal">so với tháng trước</span>
          </div>
        </div>

        {/* Metric 6: Thời gian chốt HSYC trung bình */}
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FEF5E7] text-[#D97706] border border-[#FDE3B8] flex items-center justify-center shrink-0">
              <DollarOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Thời gian chốt HSYC trung bình</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
                {avgDays.toFixed(1)} ngày
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-[#0A8A61] flex items-center gap-1 whitespace-nowrap">
            <span>↓ 0%</span>
            <span className="text-slate-400 font-normal">so với tháng trước</span>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE SECTION: 3 EXECUTIVE CARDS IN A SINGLE HORIZONTAL ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_1.05fr] gap-4">
        {/* CARD 1: Doanh thu & lợi nhuận theo tháng */}
        <div>
          <WidgetErrorBoundary title="Doanh thu & lợi nhuận theo tháng">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-slate-900 whitespace-nowrap">
                    Doanh thu & lợi nhuận theo tháng
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">Đơn vị: Tỷ đồng</span>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 mt-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="w-3.5 h-1.5 rounded-full bg-[#104E35]" />
                    <span>Doanh thu (đ)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="w-3.5 h-1.5 rounded-full bg-[#D48B1E]" />
                    <span>Lợi nhuận (đ)</span>
                  </div>
                </div>

                {/* Chart container with floating tooltip on T05/2025 */}
                <div className="relative h-[230px] w-full">
                  <Line data={lineChartData} options={lineChartOptions} />

                  {/* Tooltip Card matching image 1 */}
                  <div className="absolute right-3 top-4 bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm text-[11px] pointer-events-none z-10">
                    <div className="font-bold text-slate-800">T05/2025</div>
                    <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#104E35]" />
                      <span>Doanh thu: <strong className="text-slate-900">42.85 Tỷ</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#D48B1E]" />
                      <span>Lợi nhuận: <strong className="text-slate-900">15.49 Tỷ</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* CARD 2: Doanh thu theo Sales */}
        <div>
          <WidgetErrorBoundary title="Doanh thu theo Sales">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] font-bold text-slate-900 whitespace-nowrap">
                    Doanh thu theo Sales
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">Đơn vị: Tỷ đồng</span>
                </div>

                <div className="relative h-[255px] w-full">
                  <Bar data={salesBarData} options={salesBarOptions} plugins={[barTopLabelsPlugin]} />
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* CARD 3: Cơ cấu doanh thu theo mảng */}
        <div>
          <WidgetErrorBoundary title="Cơ cấu doanh thu theo mảng">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] font-bold text-slate-900 whitespace-nowrap">
                    Cơ cấu doanh thu theo mảng
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">Đơn vị: Tỷ đồng</span>
                </div>

                {/* Donut Chart and Legend */}
                <div className="flex items-center justify-between gap-3 my-2">
                  {/* Donut SVG with percentages on slices */}
                  <div className="relative w-[135px] h-[135px] shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Center circle text */}
                      <text x="50" y="46" textAnchor="middle" fill="#64748B" fontSize="4.5" fontWeight="500">
                        Tổng doanh thu
                      </text>
                      <text x="50" y="55" textAnchor="middle" fill="#0F172A" fontSize="6.5" fontWeight="bold">
                        {formatTyg(currentMonthRev)} Tỷ
                      </text>

                      {donutSlices.map((slice, i) => (
                        <React.Fragment key={i}>
                          <path
                            d={describeDonutSlice(50, 50, 48, 27, slice.startAngle, slice.endAngle)}
                            fill={slice.color}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                          {slice.percentage > 4 && (
                            <text
                              x={polarToCartesian(50, 50, 37.5, slice.midAngle).x}
                              y={polarToCartesian(50, 50, 37.5, slice.midAngle).y}
                              fill="#FFFFFF"
                              fontSize={slice.percentage > 10 ? "6" : "4.5"}
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="central"
                            >
                              {Math.round(slice.percentage)}%
                            </text>
                          )}
                        </React.Fragment>
                      ))}
                    </svg>
                  </div>

                  {/* Legend list */}
                  <div className="flex-1 space-y-2 text-xs min-w-0">
                    {donutSlices.map((slice, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-[11.5px] font-semibold text-slate-800 truncate">
                            {slice.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 pl-4 font-medium tabular-nums">
                          {formatTyg(slice.amount)} Tỷ ({Math.round(slice.percentage)}%)
                        </div>
                      </div>
                    ))}
                    {donutSlices.length === 0 && (
                      <div className="text-slate-400 text-xs italic">Chưa có dữ liệu</div>
                    )}
                  </div>
                </div>
              </div>
                </div>
              </div>            </WidgetErrorBoundary>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: 3 CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_0.9fr] gap-4">
        {/* Top Khách Hàng */}
        <WidgetErrorBoundary title="Top khách hàng">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6] flex items-center justify-between">
              <span className="text-[15px] font-bold text-slate-900">Top khách hàng</span>
              <span className="text-xs text-slate-400">Đơn vị: Tỷ đ</span>
            </div>
            <div className="p-0 flex-1">
              <div className="flex flex-col">
                {topCustomers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={"w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 " + item.logoBg}>
                        {item.logoLetter}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Hạng {item.rank}</div>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 tabular-nums shrink-0 ml-3">
                      {item.value}B
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </WidgetErrorBoundary>

        {/* Tổng hợp theo thị trường */}
        <WidgetErrorBoundary title="Tổng hợp theo thị trường">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6]">
              <span className="text-[15px] font-bold text-slate-900">Tổng hợp theo thị trường</span>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thị trường</th>
                    <th className="px-4 py-3 font-semibold text-right">Hồ sơ</th>
                    <th className="px-4 py-3 font-semibold text-right">Doanh thu (Tỷ)</th>
                    <th className="px-4 py-3 font-semibold text-right">Lợi nhuận (Tỷ)</th>
                    <th className="px-4 py-3 font-semibold text-right">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marketRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{row.market}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{row.dossiers}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900 tabular-nums">{row.revenue}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[#0A8A61] tabular-nums">{row.profit}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#E8F6ED] text-[#0A8A61]">
                          {row.share}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetErrorBoundary>

        {/* Báo cáo nhanh */}
        <WidgetErrorBoundary title="Báo cáo nhanh">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6]">
              <span className="text-[15px] font-bold text-slate-900">Báo cáo nhanh</span>
            </div>
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              {quickReports.map((report) => (
                <Link key={report.id} href={report.href} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-[#C8EBD5] hover:bg-[#F3FAF5] transition-colors group">
                  <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + report.iconBox}>
                    {report.icon}
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 group-hover:text-[#0A8A61] flex-1 truncate">
                    {report.title}
                  </span>
                  <RightOutlined className="text-[10px] text-slate-300 group-hover:text-[#0A8A61]" />
                </Link>
              ))}
            </div>
          </div>
        </WidgetErrorBoundary>
      </div>

    </div>
  );
}

export default function RevenuePage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  return hasRole('OPERATOR') ? <OperatorRevenue /> : <CeoRevenuePage />;
}
