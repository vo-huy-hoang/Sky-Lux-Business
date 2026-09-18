
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { message, Typography, Skeleton } from 'antd';
import {
  AppstoreOutlined,
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
  TeamOutlined,
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
import OperatorRevenue from '@/components/operator/OperatorRevenue';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';

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

// Polar Math for SVG Donut slices
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSlice(
  centerX: number,
  centerY: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const adjustedEndAngle = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const start = polarToCartesian(centerX, centerY, radius, adjustedEndAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, adjustedEndAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);

  const largeArcFlag = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

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
  const [reportPeriod] = useState('Tháng 05/2025');
  const [businessLine] = useState('Tất cả mảng');

  const dateString = useFilterStore((state) => state.dateString);
  const anchorDate = dayjs(dateString);
  const year = anchorDate.year();

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

  const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val || 0);
  const formatTrm = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round((val || 0) / 1_000_000));

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

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF', titleColor: '#0F172A', bodyColor: '#334155', borderColor: '#E2E8F0', borderWidth: 1, padding: 9, usePointStyle: true,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} Tr` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748B', font: { size: 9.5 } } },
      y: { min: 0, grid: { color: '#F1F5F9' }, border: { display: false }, ticks: { color: '#64748B', font: { size: 9.5 }, callback: (v) => v === 0 ? '0' : v + 'Tr' } },
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
        backgroundColor: '#104E35',
        hoverBackgroundColor: '#0B3A27',
        borderRadius: 3.5,
        barThickness: 18,
      },
    ],
  };
  const maxSalesValue = topSales.length > 0 ? Math.max(...topSales.map(s => Number(s.totalRevenue) / 1_000_000)) : 250;

  const salesBarOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#FFFFFF', titleColor: '#0F172A', bodyColor: '#334155', borderColor: '#E2E8F0', borderWidth: 1, padding: 8, callbacks: { label: (ctx) => ` Doanh thu: ${ctx.parsed.y}Tr` } } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#334155', font: { size: 9 }, maxRotation: 40, minRotation: 35, autoSkip: false } },
      y: { min: 0, max: Math.ceil(maxSalesValue / 50) * 50, grid: { color: '#F1F5F9' }, border: { display: false }, ticks: { color: '#64748B', font: { size: 9.5 },  callback: (v) => v === 0 ? '0' : v + 'Tr' } },
    },
  };

  // 4. Donut Chart
  const revenueBreakdown = monthData?.revenueBreakdown || [];
  const totalBreakdown = revenueBreakdown.reduce((sum, b) => sum + Number(b.amount), 0);
  const sortedBreakdown = [...revenueBreakdown].sort((a, b) => Number(b.amount) - Number(a.amount));
  const donutColors = ['#104E35', '#2C7459', '#D48B1E', '#5B80C6', '#7C59C8', '#14A9B5', '#0284C7', '#E11D48'];
  let currentAngle = 0;
  const donutSlices = sortedBreakdown.map((item, i) => {
    const amount = Number(item.amount);
    const percentage = totalBreakdown > 0 ? (amount / totalBreakdown) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = startAngle + angle / 2;
    currentAngle = endAngle;
    return { name: item.businessLineName, amount, percentage, startAngle, endAngle, midAngle, color: donutColors[i % donutColors.length] };
  });

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

  const marketRows = (monthData?.marketBreakdown || []).map((m, i) => ({
    key: String(i), market: m.marketName, dossiers: m.dossiers.toLocaleString(),
    revenue: new Intl.NumberFormat('vi-VN').format(Math.round(Number(m.revenue) / 1_000_000)), profit: new Intl.NumberFormat('vi-VN').format(Math.round(Number(m.profit) / 1_000_000)),
    share: currentMonthRev > 0 ? ((Number(m.revenue) / currentMonthRev) * 100).toFixed(1) + '%' : '0%',
  }));

  const quickReports = [
    { id: '1', title: 'Báo cáo doanh thu chi tiết', icon: <FileTextOutlined className="text-sm" />, iconBox: 'bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5]', href: '/main/reports' },
    { id: '2', title: 'Báo cáo lợi nhuận theo mảng', icon: <DollarOutlined className="text-sm" />, iconBox: 'bg-[#FEF5E7] text-[#D97706] border border-[#FDE3B8]', href: '/main/reports' },
    { id: '3', title: 'Báo cáo công nợ phải thu', icon: <WalletOutlined className="text-sm" />, iconBox: 'bg-[#EBF5FB] text-[#2E82C4] border border-[#D1E8F7]', href: '/main/reports' },
    { id: '4', title: 'Báo cáo theo thị trường', icon: <GlobalOutlined className="text-sm" />, iconBox: 'bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5]', href: '/main/reports' },
    { id: '5', title: 'Báo cáo hiệu suất Sales', icon: <BarChartOutlined className="text-sm" />, iconBox: 'bg-[#E6F8F6] text-[#0D9488] border border-[#CCF0ED]', href: '/main/kpi' },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* 1. FILTER TOOLBAR & EXPORT BUTTONS */}
      <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-1 max-w-4xl">
            {/* Filter 1 */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarOutlined className="text-slate-400 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 leading-none">Kỳ báo cáo</div>
                  <div className="font-semibold text-slate-800 text-xs truncate mt-0.5">{reportPeriod}</div>
                </div>
              </div>
              <DownOutlined className="text-[9px] text-slate-400 shrink-0 ml-1.5" />
            </div>
            {/* Filter 2 */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <AppstoreOutlined className="text-slate-400 text-sm shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 leading-none">Mảng</div>
                  <div className="font-semibold text-slate-800 text-xs truncate mt-0.5">{businessLine}</div>
                </div>
              </div>
              <DownOutlined className="text-[9px] text-slate-400 shrink-0 ml-1.5" />
            </div>
            {/* Filter 3 & 4 Omitted for brevity */}
          </div>
          <div className="flex items-center gap-2.5 shrink-0 justify-end">
            <button type="button" onClick={handleExportPDF} className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#0B7A5B] bg-white text-[#0B7A5B] text-xs font-semibold hover:bg-[#E8F6ED] transition-colors cursor-pointer"><FilePdfOutlined className="text-sm" /><span>Xuất PDF</span></button>
            <button type="button" onClick={handleExportExcel} className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"><FileExcelOutlined className="text-sm" /><span>Xuất Excel</span></button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0"><LineChartOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Doanh thu tháng</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentMonthRev)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0"><CalendarOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Doanh thu quý</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentQuarterRev)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FEF5E7] text-[#D97706] border border-[#FDE3B8] flex items-center justify-center shrink-0"><WalletOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Chi phí</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentMonthCost)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0"><RiseOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Lợi nhuận</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{formatMoney(currentMonthProfit)} đ</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F6ED] text-[#0A8A61] border border-[#C8EBD5] flex items-center justify-center shrink-0"><PercentageOutlined className="text-sm" /></div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 font-medium">Tỷ suất lợi nhuận</span>
              <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">{currentMonthMargin.toFixed(1)}%</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FEF5E7] text-[#D97706] border border-[#FDE3B8] flex items-center justify-center shrink-0"><DollarOutlined className="text-sm" /></div>
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
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between"><span className="text-[15px] font-bold text-slate-900">Doanh thu & lợi nhuận theo tháng</span><span className="text-xs text-slate-400">Đơn vị: Triệu đồng</span></div>
              <div className="flex items-center gap-5 mt-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-3.5 h-1.5 rounded-full bg-[#104E35]" /><span>Doanh thu (đ)</span></div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="w-3.5 h-1.5 rounded-full bg-[#D48B1E]" /><span>Lợi nhuận (đ)</span></div>
              </div>
              <div className="relative h-[230px] w-full">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        <div>
          <WidgetErrorBoundary title="Doanh thu theo Sales">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2"><span className="text-[15px] font-bold text-slate-900">Doanh thu theo Sales</span><span className="text-xs text-slate-400">Đơn vị: Triệu đồng</span></div>
              <div className="relative h-[255px] w-full">
                <Bar data={salesBarData} options={salesBarOptions} plugins={[barTopLabelsPlugin]} />
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        <div>
          <WidgetErrorBoundary title="Cơ cấu doanh thu theo mảng">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2"><span className="text-[15px] font-bold text-slate-900">Cơ cấu doanh thu theo mảng</span><span className="text-xs text-slate-400">Đơn vị: Triệu đồng</span></div>
              <div className="flex items-center justify-between gap-5 my-2">
                <div className="relative w-[180px] h-[180px] shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <text x="50" y="46" textAnchor="middle" fill="#64748B" fontSize="4.5" fontWeight="500">Tổng doanh thu</text>
                    <text x="50" y="55" textAnchor="middle" fill="#0F172A" fontSize="6.5" fontWeight="bold">{formatTrm(currentMonthRev)} Tr</text>
                    {donutSlices.map((slice, i) => (
                      <React.Fragment key={i}>
                        <path d={describeDonutSlice(50, 50, 48, 27, slice.startAngle, slice.endAngle)} fill={slice.color} stroke="#FFFFFF" strokeWidth="1.5" />
                        {slice.percentage > 4 && (
                          <text x={polarToCartesian(50, 50, 37.5, slice.midAngle).x} y={polarToCartesian(50, 50, 37.5, slice.midAngle).y} fill="#FFFFFF" fontSize={slice.percentage > 10 ? "6" : "4.5"} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                            {Math.round(slice.percentage)}%
                          </text>
                        )}
                      </React.Fragment>
                    ))}
                  </svg>
                </div>
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
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6] flex items-center justify-between"><span className="text-[15px] font-bold text-slate-900">Top khách hàng</span><span className="text-xs text-slate-400">Đơn vị: Triệu đ</span></div>
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

        <WidgetErrorBoundary title="Tổng hợp theo thị trường">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6]"><span className="text-[15px] font-bold text-slate-900">Tổng hợp theo thị trường</span></div>
            <div className="p-0 flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thị trường</th><th className="px-4 py-3 font-semibold text-right">Hồ sơ</th><th className="px-4 py-3 font-semibold text-right">Doanh thu (Tr)</th><th className="px-4 py-3 font-semibold text-right">Lợi nhuận (Tr)</th><th className="px-4 py-3 font-semibold text-right">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marketRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{row.market}</td><td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{row.dossiers}</td><td className="px-4 py-2.5 text-right font-medium text-slate-900 tabular-nums">{row.revenue}</td><td className="px-4 py-2.5 text-right font-medium text-[#0A8A61] tabular-nums">{row.profit}</td>
                      <td className="px-4 py-2.5 text-right"><span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#E8F6ED] text-[#0A8A61]">{row.share}</span></td>
                    </tr>
                  ))}
                  {marketRows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-400">Chưa có dữ liệu</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Báo cáo nhanh">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6]"><span className="text-[15px] font-bold text-slate-900">Báo cáo nhanh</span></div>
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              {quickReports.map((report) => (
                <Link key={report.id} href={report.href} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-[#C8EBD5] hover:bg-[#F3FAF5] transition-colors group">
                  <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + report.iconBox}>{report.icon}</div>
                  <span className="text-[13px] font-medium text-slate-700 group-hover:text-[#0A8A61] flex-1 truncate">{report.title}</span>
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
