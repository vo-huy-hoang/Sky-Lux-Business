
'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DatePicker, message, Skeleton } from 'antd';
import {
  BarChartOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LineChartOutlined,
  PercentageOutlined,
  RightOutlined,
  RiseOutlined,
  ShopOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import dayjs from 'dayjs';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFilterStore } from '@/lib/stores/filter-store';
import { useCeoDashboard, useCeoMonthlyTrend, useOperatorSalesSummary } from '@/hooks/dashboards';
const OperatorRevenue = dynamic(
  () => import('@/components/operator/OperatorRevenue'),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
  }
);
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import { formatCurrency } from '@/lib/financial-calculations';
import { RevenueBreakdownToggle, RevenueBreakdownMode } from '@/components/ceo/RevenueBreakdownToggle';
import { getRevenueDonutSlices, RevenueDonutChart } from '@/components/ceo/RevenueDonutChart';
import { themeTokens } from '@/lib/theme/tokens.config';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  ChartTooltip,
);

// Chart.js plugin to draw value labels above bars for Card 2
const barTopLabelsPlugin = {
  id: 'barTopLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value !== undefined && value !== null) {
          ctx.save();
          ctx.fillStyle = '#1E293B';
          ctx.font = 'bold 10px Inter, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(value + 'Tr', bar.x, bar.y - 4);
          ctx.restore();
        }
      });
    });
  },
};

function CeoRevenuePage() {
  const datePickerRef = useRef<any>(null);
  const [breakdownMode, setBreakdownMode] = useState<RevenueBreakdownMode>('MARKET_TYPE');

  const dateString = useFilterStore((state) => state.dateString);
  const setDateString = useFilterStore((state) => state.setDateString);
  const anchorDate = dayjs(dateString);
  const year = anchorDate.year();
  const reportPeriod = `Tháng ${anchorDate.format('MM/YYYY')}`;

  // API Hooks
  const { data: monthData } = useCeoDashboard({ periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') });
  const { data: quarterData } = useCeoDashboard({ periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') });
  const { data: monthlyTrend = [] } = useCeoMonthlyTrend(year);
  const { data: salesSummary = [] } = useOperatorSalesSummary();

  const handleExportPDF = () => {
    message.loading({ content: 'Đang chuẩn bị xuất file PDF...', key: 'export-pdf' });
    setTimeout(() => { message.success({ content: 'Đã xuất báo cáo PDF thành công!', key: 'export-pdf' }); }, 1000);
  };

  const handleExportExcel = () => {
    message.loading({ content: 'Đang kết xuất dữ liệu Excel...', key: 'export-excel' });
    setTimeout(() => { message.success({ content: 'Đã xuất file Excel Báo cáo Doanh thu & Thống kê!', key: 'export-excel' }); }, 1000);
  };

  const formatMoney = (val: number) => formatCurrency(val, { showSymbol: false });
  const formatTrm = (val: number) => formatCurrency(Math.round((val || 0) / 1_000_000), { showSymbol: false });

  // 1. KPI Calculations
  const currentMonthRev = monthData?.totalRevenue || 0;
  const currentMonthProfit = monthData?.totalProfit || 0;
  const currentMonthCost = currentMonthRev - currentMonthProfit;
  const currentMonthMargin = currentMonthRev > 0 ? (currentMonthProfit / currentMonthRev) * 100 : 0;
  const currentQuarterRev = quarterData?.totalRevenue || 0;
  const avgDays = monthData?.avgDossierClosingDays || 0;

  // 2. Line Chart Data
  const monthlyLabels = monthlyTrend.map(t => t.label);
  const chartRevenue = monthlyTrend.map(t => Number(t.totalRevenue) / 1_000_000);
  const chartProfit = monthlyTrend.map(t => Number(t.totalProfit) / 1_000_000);

  const lineChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: chartRevenue,
        borderColor: themeTokens.brand.primary[800],
        backgroundColor: themeTokens.brand.primary[800],
        tension: 0.35,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: themeTokens.neutral.surface,
        pointBorderColor: themeTokens.brand.primary[800],
        pointBorderWidth: 2,
      },
      {
        label: 'Lợi nhuận (đ)',
        data: chartProfit,
        borderColor: themeTokens.brand.gold.main,
        backgroundColor: themeTokens.brand.gold.main,
        tension: 0.35,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: themeTokens.neutral.surface,
        pointBorderColor: themeTokens.brand.gold.main,
        pointBorderWidth: 2,
      },
    ],
  };

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: themeTokens.neutral.surface,
        titleColor: themeTokens.neutral.text,
        bodyColor: themeTokens.neutral.textMuted,
        borderColor: themeTokens.neutral.border,
        borderWidth: 1,
        padding: 9,
        usePointStyle: true,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} Tr` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: themeTokens.neutral.textSoft, font: { size: 9.5 } } },
      y: { min: 0, grid: { color: themeTokens.charts.gridLines }, border: { display: false }, ticks: { color: themeTokens.neutral.textSoft, font: { size: 9.5 }, callback: (v) => v === 0 ? '0' : v + 'Tr' } },
    },
  };

  // 3. Sales Bar Chart Data
  const topSales = [...salesSummary].sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue)).slice(0, 7);
  const salesBarData = {
    labels: topSales.map(s => s.salesUserName),
    datasets: [
      {
        label: 'Doanh thu (Tr)',
        data: topSales.map(s => Number(s.totalRevenue) / 1_000_000),
        backgroundColor: themeTokens.brand.primary[800],
        hoverBackgroundColor: themeTokens.brand.primary[900],
        borderRadius: 3.5,
        barThickness: 18,
      },
    ],
  };
  const maxSalesValue = topSales.length > 0 ? Math.max(...topSales.map(s => Number(s.totalRevenue) / 1_000_000)) : 250;

  const salesBarOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: themeTokens.neutral.surface,
        titleColor: themeTokens.neutral.text,
        bodyColor: themeTokens.neutral.textMuted,
        borderColor: themeTokens.neutral.border,
        borderWidth: 1,
        padding: 8,
        callbacks: { label: (ctx) => ` Doanh thu: ${ctx.parsed.y}Tr` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: themeTokens.neutral.textMuted, font: { size: 9 }, maxRotation: 40, minRotation: 35, autoSkip: false } },
      y: { min: 0, max: Math.ceil(maxSalesValue / 50) * 50, grid: { color: themeTokens.neutral.divider }, border: { display: false }, ticks: { color: themeTokens.neutral.textSoft, font: { size: 9.5 },  callback: (v) => v === 0 ? '0' : v + 'Tr' } },
    },
  };

  // 4. Donut Chart
  const breakdownRows = breakdownMode === 'MARKET_TYPE'
    ? (monthData?.revenueBreakdown || []).map((item) => ({ name: item.marketTypeName, amount: item.amount }))
    : (monthData?.businessLineBreakdown || []).map((item) => ({ name: item.businessLineName, amount: item.amount }));
  const sortedBreakdown = [...breakdownRows].sort((a, b) => Number(b.amount) - Number(a.amount));
  const donutSlices = getRevenueDonutSlices(sortedBreakdown);

  // 5. Bottom Section Data
  const customerColors = [
    { badgeBg: 'bg-[#FEF3C7] text-[#D97706]', logoBg: 'bg-[#F97316] text-white' },
    { badgeBg: 'bg-[#DBEAFE] text-[#2563EB]', logoBg: 'bg-[#0284C7] text-white' },
    { badgeBg: 'bg-[#FEF3C7] text-[#92400E]', logoBg: 'bg-[#059669] text-white' },
    { badgeBg: 'bg-slate-100 text-slate-500', logoBg: 'bg-[#E11D48] text-white' },
    { badgeBg: 'bg-slate-100 text-slate-500', logoBg: 'bg-[#1E293B] text-white' },
  ];
  const topCustomers = (monthData?.vipCustomers || []).slice(0, 5).map((c, i) => ({
    rank: i + 1, name: c.customerName, value: new Intl.NumberFormat('vi-VN').format(Math.round(Number(c.spend) / 1_000_000)),
    logoLetter: c.customerName.charAt(0).toUpperCase(), logoBg: customerColors[i % customerColors.length].logoBg,
  }));

  const supplierRows = (monthData?.supplierBreakdown || [])
    .map((supplier) => ({
      ...supplier,
      amount: Number(supplier.amount || 0),
    }))
    .sort((a, b) => b.amount - a.amount);
  const supplierTotal = supplierRows.reduce((sum, supplier) => sum + supplier.amount, 0);
  const highestSupplierAmount = supplierRows[0]?.amount || 0;

  const quickReports = [
    { id: '1', title: 'Báo cáo doanh thu chi tiết', icon: <FileTextOutlined className="text-sm" />, iconBox: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)]', href: '/reports' },
    { id: '2', title: 'Báo cáo lợi nhuận theo mảng', icon: <DollarOutlined className="text-sm" />, iconBox: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning-soft)]', href: '/reports' },
    { id: '3', title: 'Báo cáo công nợ phải thu', icon: <WalletOutlined className="text-sm" />, iconBox: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border border-[var(--color-info-soft)]', href: '/reports' },
    { id: '4', title: 'Báo cáo theo thị trường', icon: <GlobalOutlined className="text-sm" />, iconBox: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)]', href: '/reports' },
    { id: '5', title: 'Báo cáo hiệu suất Sales', icon: <BarChartOutlined className="text-sm" />, iconBox: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-700)] border border-[var(--color-primary-soft-2)]', href: '/kpi' },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* 1. FILTER TOOLBAR & EXPORT BUTTONS */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-1 items-center">
              {/* Filter 1 */}
            <div
              onClick={() => {
                const input = datePickerRef.current?.nativeElement?.querySelector('input') || datePickerRef.current?.input;
                input?.focus?.();
                input?.click?.();
              }}
              className="flex w-full max-w-[270px] items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CalendarOutlined className="text-slate-400 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 leading-none">Kỳ báo cáo</div>
                  <DatePicker
                    ref={datePickerRef}
                    picker="month"
                    value={anchorDate}
                    onChange={(value) => {
                      if (value) setDateString(value.startOf('month').format('YYYY-MM-DD'));
                    }}
                    format="MM/YYYY"
                    allowClear={false}
                    inputReadOnly
                    variant="borderless"
                    suffixIcon={null}
                    className="!w-[70px] !p-0 !text-xs !border-0 !shadow-none !outline-none [&.ant-picker-focused]:!shadow-none [&.ant-picker-focused]:!border-transparent [&.ant-picker-focused]:!outline-none [&_.ant-picker-input>input]:!font-semibold [&_.ant-picker-input>input]:!text-slate-800 [&_.ant-picker-input>input]:!cursor-pointer [&_.ant-picker-input>input]:!outline-none [&_.ant-picker-input>input]:!shadow-none [&_.ant-picker-input>input]:!border-none [&_.ant-picker-input>input]:focus:!outline-none [&_.ant-picker-input>input]:focus-visible:!outline-none"
                    aria-label={`Chọn ${reportPeriod}`}
                  />
                </div>
              </div>
              <DownOutlined className="text-[9px] text-slate-400 shrink-0 ml-1.5" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 justify-end">
            <button type="button" onClick={handleExportPDF} className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[var(--color-primary-600)] bg-white text-[var(--color-primary-600)] text-xs font-semibold hover:bg-[var(--color-primary-soft)] transition-colors cursor-pointer"><FilePdfOutlined className="text-sm" /><span>Xuất PDF</span></button>
            <button type="button" onClick={handleExportExcel} className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--color-primary-900)] hover:bg-[var(--color-primary-950)] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"><FileExcelOutlined className="text-sm" /><span>Xuất Excel</span></button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)] flex items-center justify-center shrink-0"><LineChartOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Doanh thu tháng</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentMonthRev)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)] flex items-center justify-center shrink-0"><CalendarOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Doanh thu quý</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentQuarterRev)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning-soft)] flex items-center justify-center shrink-0"><WalletOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Chi phí</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentMonthCost)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)] flex items-center justify-center shrink-0"><RiseOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Lợi nhuận</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentMonthProfit)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)] flex items-center justify-center shrink-0"><PercentageOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Tỷ suất lợi nhuận</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{currentMonthMargin.toFixed(1)}%</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning-soft)] flex items-center justify-center shrink-0"><DollarOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Thời gian chốt HSYC</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{avgDays.toFixed(1)} ngày</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_1.05fr] gap-4">
        <div>
          <WidgetErrorBoundary title="Doanh thu & lợi nhuận theo tháng">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between"><span className="text-[15px] font-bold text-slate-900">Doanh thu & lợi nhuận theo tháng</span><span className="text-xs text-slate-400">Đơn vị: Triệu đồng</span></div>
              <div className="flex items-center gap-5 mt-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-3.5 h-1.5 rounded-full bg-[var(--color-primary-800)]" /><span>Doanh thu (đ)</span></div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-3.5 h-1.5 rounded-full bg-[var(--color-gold)]" /><span>Lợi nhuận (đ)</span></div>
              </div>
              <div className="relative h-[230px] w-full">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        <div>
          <WidgetErrorBoundary title="Doanh thu theo Sales">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2"><span className="text-[15px] font-bold text-slate-900">Doanh thu theo Sales</span><span className="text-xs text-slate-400">Đơn vị: Triệu đồng</span></div>
              <div className="relative h-[255px] w-full">
                <Bar data={salesBarData} options={salesBarOptions} plugins={[barTopLabelsPlugin]} />
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        <div>
          <WidgetErrorBoundary title="Cơ cấu doanh thu theo cách phân loại">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <span className="text-[15px] font-bold text-slate-900">Cơ cấu doanh thu theo {breakdownMode === 'MARKET_TYPE' ? 'loại hình' : 'mảng'}</span>
                <div className="flex items-center gap-3">
                  <RevenueBreakdownToggle value={breakdownMode} onChange={setBreakdownMode} />
                  <span className="text-xs text-slate-400 whitespace-nowrap">Đơn vị: Triệu đồng</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-5 my-2">
                <RevenueDonutChart
                  items={sortedBreakdown}
                  total={currentMonthRev}
                  totalDisplay={formatTrm(currentMonthRev)}
                  ariaLabel="Cơ cấu doanh thu theo cách phân loại"
                  className="w-[180px] h-[180px]"
                />
                <div className="flex-1 space-y-3 min-w-0">
                  {donutSlices.map((slice, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} /><span className="text-[13px] font-medium text-slate-800 truncate">{slice.name}</span></div>
                      <div className="text-[12px] text-slate-500 pl-5 mt-0.5 tabular-nums">{formatTrm(slice.amount)} Tr ({Math.round(slice.percentage)}%)</div>
                    </div>
                  ))}
                  {donutSlices.length === 0 && <div className="text-slate-400 text-sm italic">Chưa có dữ liệu</div>}
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* 4. BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_0.9fr] gap-4">
        <WidgetErrorBoundary title="Top khách hàng">
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between"><span className="text-[15px] font-bold text-slate-900">Top khách hàng</span><span className="text-xs text-slate-400">Đơn vị: Triệu đ</span></div>
            <div className="p-0 flex-1">
              <div className="flex flex-col">
                {topCustomers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={"w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 " + item.logoBg}>{item.logoLetter}</div>
                      <div className="min-w-0"><div className="font-semibold text-sm text-slate-800 truncate">{item.name}</div><div className="text-[11px] text-slate-400 mt-0.5">Hạng {item.rank}</div></div>
                    </div>
                    <div className="font-bold text-slate-900 tabular-nums shrink-0 ml-3">{item.value}Tr</div>
                  </div>
                ))}
                {topCustomers.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Chưa có dữ liệu</div>}
              </div>
            </div>
          </div>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Doanh thu Nhà cung cấp">
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border border-[var(--color-primary-soft-2)] flex items-center justify-center shrink-0"><ShopOutlined className="text-sm" /></div>
                  <span className="text-[15px] font-bold text-slate-900">Doanh thu Nhà cung cấp</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 ml-9">Xếp hạng theo chi phí thuần trong kỳ</p>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Top {supplierRows.length} NCC</span>
            </div>
            <div className="p-4 flex-1">
              {supplierRows.length > 0 ? (
                <div className="space-y-4" role="list" aria-label="Doanh thu theo nhà cung cấp">
                  {supplierRows.map((supplier, index) => {
                    const share = supplierTotal > 0 ? (supplier.amount / supplierTotal) * 100 : 0;
                    const width = highestSupplierAmount > 0 ? (supplier.amount / highestSupplierAmount) * 100 : 0;
                    const barColor = index === 0 ? themeTokens.brand.primary[800] : index === 1 ? themeTokens.brand.primary[600] : themeTokens.brand.primary.hoverBorder;
                    return (
                      <div key={supplier.supplierId} role="listitem" className="group">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-center shrink-0">{index + 1}</span>
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-slate-800 truncate">{supplier.supplierName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{supplier.supplierCode} · {supplier.dossierCount} hồ sơ</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[13px] font-bold text-slate-900 tabular-nums">{formatTrm(supplier.amount)} Tr</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">{share.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-label={`${supplier.supplierName}: ${formatTrm(supplier.amount)} triệu đồng`} aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full transition-all duration-300 group-hover:brightness-95" style={{ width: `${width}%`, backgroundColor: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full min-h-[170px] flex flex-col items-center justify-center text-center">
                  <ShopOutlined className="text-2xl text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Chưa có dữ liệu nhà cung cấp trong kỳ</p>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">Tổng nhóm đang hiển thị</span>
              <span className="text-sm font-bold text-[var(--color-primary-600)] tabular-nums">{formatTrm(supplierTotal)} Tr</span>
            </div>
          </div>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Báo cáo nhanh">
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[var(--color-border)]"><span className="text-[15px] font-bold text-slate-900">Báo cáo nhanh</span></div>
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              {quickReports.map((report) => (
                <Link key={report.id} href={report.href} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-[var(--color-primary-soft-2)] hover:bg-[var(--color-primary-soft)] transition-colors group">
                  <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + report.iconBox}>{report.icon}</div>
                  <span className="text-[13px] font-medium text-slate-700 group-hover:text-[var(--color-primary-600)] flex-1 truncate">{report.title}</span>
                  <RightOutlined className="text-[10px] text-slate-300 group-hover:text-[var(--color-primary-600)]" />
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
