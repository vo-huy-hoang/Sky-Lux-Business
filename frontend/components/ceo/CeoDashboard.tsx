'use client';

import React from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
} from 'antd';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  LineChartOutlined,
  RightOutlined,
  ShopOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import type { ChartOptions } from 'chart.js';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { EstimateItem, EstimateStatus } from '@/types/estimate';
import { DossierItem } from '@/types/dossier';
import { CeoMonthlyTrendItem } from '@/types/dashboard';
import { useCeoDashboard, useCeoMonthlyTrend, useOperatorSalesSummary } from '@/hooks/dashboards';
import { useNotificationsQuery } from '@/hooks/useNotificationsRealtime';
import { useFilterStore } from '@/lib/stores/filter-store';
import { queryKeys } from '@/lib/query-keys';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import { formatCurrency } from '@/lib/financial-calculations';
import { RevenueBreakdownToggle, RevenueBreakdownMode } from '@/components/ceo/RevenueBreakdownToggle';
import { getRevenueDonutSlices, RevenueDonutChart } from '@/components/ceo/RevenueDonutChart';
import { themeTokens } from '@/lib/theme/tokens.config';
import dayjs from 'dayjs';
import CeoExportActions from './widgets/CeoExportActions';
import CeoMetricsGrid from './widgets/CeoMetricsGrid';
import CeoRevenueTrendWidget from './widgets/CeoRevenueTrendWidget';
import { CeoSalesRanking, CeoDossiersTable } from './widgets/CeoPerformanceTable';

const STATUS_META: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: themeTokens.neutral.textSoft },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: themeTokens.semantic.purple.main },
  RESUBMITTED: { label: 'Đã gửi lại', className: 'skylux-status-purple', color: themeTokens.semantic.purple.main },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: themeTokens.brand.gold.main },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple', color: themeTokens.semantic.info.main },
  EDITING: { label: 'Đang sửa', className: 'skylux-status-warning', color: themeTokens.brand.gold.strong },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: themeTokens.semantic.success.main },
  COMPLETED: { label: 'Hoàn thành', className: 'skylux-status-valid', color: themeTokens.semantic.success.dark },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: themeTokens.semantic.danger.main },
  LOCKED: { label: 'Đã khóa', className: 'skylux-status-danger', color: themeTokens.semantic.danger.strong },
};

const customerLogoColors = [
  'bg-amber-600 text-white',
  'bg-sky-600 text-white',
  'bg-emerald-600 text-white',
  'bg-rose-600 text-white',
  'bg-slate-700 text-white',
];

function statusMeta(status?: string) {
  return STATUS_META[status || ''] || {
    label: status || 'Chưa xác định',
    className: 'skylux-status-info',
    color: themeTokens.neutral.textMuted,
  };
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

export default function CeoDashboard() {

  const selectedYear = useFilterStore((state) => state.selectedYear);
  const dateString = useFilterStore((state) => state.dateString);
  const setDateString = useFilterStore((state) => state.setDateString);
  const [allTime, setAllTime] = React.useState(false);
  const anchorDate = dayjs(dateString);

  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
  } = useCeoDashboard({
    periodType: 'MONTHLY',
    ...(allTime ? { allTime: true } : { date: anchorDate.format('YYYY-MM-DD') }),
  });

  const { data: dossierResponse, isLoading: isLoadingDossiers } = useQuery<{
    data: DossierItem[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 6 }),
    queryFn: ({ signal }) => dossiersService.getDossiers({ page: 1, limit: 6 }, { signal }),
  });

  const { data: monthlyTrend = [], isLoading: isLoadingTrend } = useCeoMonthlyTrend(selectedYear, undefined, allTime);
  const { data: salesSummary = [], isLoading: isLoadingSales } = useOperatorSalesSummary();
  const { data: notificationsResponse, isLoading: isLoadingNotifications } = useNotificationsQuery({ page: 1, limit: 3 });
  const submittedApprovalsQuery = useQuery({
    queryKey: queryKeys.approvals.submitted({ status: EstimateStatus.SUBMITTED }),
    queryFn: ({ signal }) => estimatesService.getEstimates(
      { page: 1, limit: 5, status: EstimateStatus.SUBMITTED },
      { signal },
    ),
  });
  const reviewingApprovalsQuery = useQuery({
    queryKey: queryKeys.approvals.reviewing({ status: EstimateStatus.IN_REVIEW }),
    queryFn: ({ signal }) => estimatesService.getEstimates(
      { page: 1, limit: 5, status: EstimateStatus.IN_REVIEW },
      { signal },
    ),
  });
  const dossiers = dossierResponse?.data || [];
  const funnel = overview?.funnel || [];
  const funnelMap = new Map<string, number>(funnel.map((item: { status: string; count: number }) => [item.status, item.count]));
  const totalDossiers = funnel.reduce((sum: number, item: { status: string; count: number }) => sum + item.count, 0);
  const pendingCount = (funnelMap.get('SUBMITTED') || 0) + (funnelMap.get('IN_REVIEW') || 0);
  const latestDossiers = dossiers.slice(0, 6);
  const [breakdownMode, setBreakdownMode] = React.useState<RevenueBreakdownMode>('MARKET_TYPE');
  const chartBreakdown = React.useMemo(
    () => breakdownMode === 'MARKET_TYPE'
      ? (overview?.revenueBreakdown || []).map((item) => ({ name: item.marketTypeName, amount: item.amount }))
      : (overview?.businessLineBreakdown || []).map((item) => ({ name: item.businessLineName, amount: item.amount })),
    [breakdownMode, overview?.businessLineBreakdown, overview?.revenueBreakdown],
  );
  const sortedChartBreakdown = React.useMemo(
    () => [...chartBreakdown].sort((a, b) => Number(b.amount) - Number(a.amount)),
    [chartBreakdown],
  );
  const chartBreakdownTotal = React.useMemo(
    () => sortedChartBreakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [sortedChartBreakdown],
  );
  const donutSlices = React.useMemo(
    () => getRevenueDonutSlices(sortedChartBreakdown),
    [sortedChartBreakdown],
  );
  const supplierRows = React.useMemo(
    () => [...(overview?.supplierBreakdown || [])]
      .map((supplier) => ({ ...supplier, amount: Number(supplier.amount || 0) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    [overview?.supplierBreakdown],
  );
  const supplierTotal = React.useMemo(
    () => supplierRows.reduce((total, supplier) => total + supplier.amount, 0),
    [supplierRows],
  );
  const highestSupplierAmount = supplierRows[0]?.amount || 0;
  const topCustomers = (overview?.vipCustomers || []).slice(0, 5);
  const quickReports = [
    { title: 'Báo cáo doanh thu chi tiết', icon: <FileTextOutlined />, iconBox: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border-[var(--color-primary-soft-2)]', href: '/reports' },
    { title: 'Báo cáo lợi nhuận theo mảng', icon: <DollarOutlined />, iconBox: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-soft)]', href: '/reports' },
    { title: 'Báo cáo công nợ phải thu', icon: <WalletOutlined />, iconBox: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-soft)]', href: '/reports' },
    { title: 'Báo cáo theo thị trường', icon: <GlobalOutlined />, iconBox: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)] border-[var(--color-primary-soft-2)]', href: '/reports' },
    { title: 'Báo cáo hiệu suất Sales', icon: <BarChartOutlined />, iconBox: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-700)] border-[var(--color-primary-soft-2)]', href: '/kpi' },
  ];
  const notificationsList = notificationsResponse?.data || [];
  const pendingApprovals = React.useMemo(
    () => [...(submittedApprovalsQuery.data?.data || []), ...(reviewingApprovalsQuery.data?.data || [])]
      .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime())
      .slice(0, 5),
    [reviewingApprovalsQuery.data?.data, submittedApprovalsQuery.data?.data],
  );
  const topSalesList = React.useMemo(
    () => [...salesSummary]
      .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
      .map((sales, index, list) => ({
        ...sales,
        rank: index + 1,
        progress: list[0]?.totalRevenue ? Math.round((Number(sales.totalRevenue) / Number(list[0].totalRevenue)) * 100) : 0,
      })),
    [salesSummary],
  );
  const isLoadingApprovals = submittedApprovalsQuery.isLoading || reviewingApprovalsQuery.isLoading;
  const maxMonthlyValue = Math.max(
    1,
    ...monthlyTrend.map((month: CeoMonthlyTrendItem) => Number(month.totalRevenue || 0) / 1_000_000),
    ...monthlyTrend.map((month: CeoMonthlyTrendItem) => Number(month.totalProfit || 0) / 1_000_000),
  );

  const statusRows = [
    { key: 'DRAFT', label: 'Mới tạo' },
    { key: 'IN_REVIEW', label: 'Đang xử lý' },
    { key: 'SUBMITTED', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'COMPLETED', label: 'Đã hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' },
  ].map((row) => ({ ...row, count: funnelMap.get(row.key) || 0, color: statusMeta(row.key).color }));

  const currentMonthLabel = `Tháng ${anchorDate.format('MM/YYYY')}`;

  const revenueHint = Number(overview?.totalRevenue || 0) > 0
    ? 'Dữ liệu hồ sơ đã khóa sổ'
    : allTime ? 'Chưa có hồ sơ khóa sổ' : 'Chưa có hồ sơ khóa sổ trong tháng đã chọn';

  const profitHint = Number(overview?.totalProfit || 0) > 0
    ? 'Theo lợi nhuận gộp hồ sơ'
    : allTime ? 'Chưa có hồ sơ khóa sổ' : 'Chưa có hồ sơ khóa sổ trong tháng đã chọn';

  if (isOverviewError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải dữ liệu điều hành"
        description="Hệ thống dashboard CEO chưa phản hồi. Hãy kiểm tra kết nối rồi tải lại trang."
      />
    );
  }

  return (
    <div className="ceo-dashboard space-y-4">
      <CeoExportActions
        allTime={allTime}
        onToggleAllTime={setAllTime}
        anchorDate={anchorDate}
        onDateChange={setDateString}
        overview={overview}
        totalDossiers={totalDossiers}
        pendingCount={pendingCount}
        sortedChartBreakdown={sortedChartBreakdown}
      />

      <CeoMetricsGrid
        overview={overview}
        totalDossiers={totalDossiers}
        pendingCount={pendingCount}
        isLoading={isLoadingOverview}
        allTime={allTime}
        currentMonthLabel={currentMonthLabel}
      />

      {/* Dashboard charts use the full row in a balanced two-column layout. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Monthly revenue */}
        <div className="xl:col-span-6">
          <CeoRevenueTrendWidget
            monthlyTrend={monthlyTrend}
            isLoadingTrend={isLoadingTrend}
            allTime={allTime}
            selectedYear={selectedYear}
          />
        </div>

        {/* Revenue composition */}
        <div className="xl:col-span-6">
          <WidgetErrorBoundary title="Cơ cấu doanh thu theo cách phân loại">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <h2 className="text-[15px] font-bold text-slate-900 m-0">Cơ cấu doanh thu theo {breakdownMode === 'MARKET_TYPE' ? 'loại hình' : 'mảng'}</h2>
                  <RevenueBreakdownToggle value={breakdownMode} onChange={setBreakdownMode} />
                </div>

                {/* Body: Donut + Legend */}
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-5 sm:gap-6 my-auto py-2">
                  {chartBreakdown.length ? (
                    <RevenueDonutChart
                      items={sortedChartBreakdown}
                      total={chartBreakdownTotal}
                      ariaLabel="Cơ cấu doanh thu theo cách phân loại"
                      className="w-[180px] h-[180px] 2xl:w-[195px] 2xl:h-[195px] shrink-0"
                    />
                  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giao dịch khóa sổ trong kỳ này" />}

                  {/* Legend list */}
                  <div className="w-full sm:flex-1 space-y-3 min-w-0">
                    {donutSlices.slice(0, 5).map((slice) => (
                      <div key={slice.name}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-xs font-semibold text-slate-800 truncate" title={slice.name}>{slice.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pl-4.5 font-medium tabular-nums">{formatCurrency(slice.amount)} ({Math.round(slice.percentage)}%)</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Footer */}
              <div className="text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
                Tổng doanh thu: <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(chartBreakdownTotal)}</span>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* CARD 3: Hồ sơ theo trạng thái */}
        <div className="xl:col-span-3">
          <WidgetErrorBoundary title="Hồ sơ theo trạng thái">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 mb-1">Hồ sơ theo trạng thái</h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {statusRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between py-2">
                      <span className="text-slate-600 font-medium">{row.label}</span>
                      <span className="font-bold text-sm tabular-nums" style={{ color: row.color }}>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-1">
                <span className="text-sm font-bold text-slate-900">Tổng cộng</span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">{totalDossiers.toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>
        {/* CARD 4: Phê duyệt cần xử lý hôm nay (col-span-5) */}
        <div className="xl:col-span-5">
          <WidgetErrorBoundary title="Phê duyệt cần xử lý hôm nay">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 mb-3">Phê duyệt cần xử lý hôm nay</h2>
                <div className="space-y-3">
                  {isLoadingApprovals ? <Skeleton active paragraph={{ rows: 5 }} /> : pendingApprovals.length ? pendingApprovals.map((item: EstimateItem) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 items-center gap-x-3 gap-y-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`w-[82px] shrink-0 px-1.5 py-0.5 rounded text-[10.5px] font-medium border text-center truncate ${item.status === EstimateStatus.IN_REVIEW ? 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-soft)]' : 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-soft)]'}`}
                        >
                          {item.status === EstimateStatus.IN_REVIEW ? 'Đang xử lý' : 'Chờ duyệt'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="max-w-[40%] shrink-0 truncate font-semibold text-slate-700 text-xs">
                              {item.dossier?.code || item.dossierId.slice(0, 8)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-slate-800 font-medium" title={item.dossier?.name || item.dossier?.route || 'Dự toán'}>
                              {item.dossier?.name || item.dossier?.route || 'Dự toán'}
                            </span>
                          </div>
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {formatDateTime(item.submittedAt || item.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pl-[90px] sm:pl-0">
                        <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(item.totalRevenue)}
                        </span>
                        <Link href="/approvals">
                          <button
                            type="button"
                            className="px-2.5 py-0.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:text-[var(--color-primary-600)] hover:border-[var(--color-primary-600)] bg-white transition-colors cursor-pointer"
                          >
                            Xem
                          </button>
                        </Link>
                      </div>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tuyệt vời! Hiện không có hồ sơ nào đang chờ duyệt" />}
                </div>
              </div>

              <Link
                href="/approvals"
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
              >
                <span>Xem tất cả hồ sơ chờ duyệt</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* Sales revenue ranking (col-span-4) */}
        <div className="xl:col-span-4">
          <CeoSalesRanking
            topSalesList={topSalesList}
            isLoadingSales={isLoadingSales}
          />
        </div>

        {/* CARD 6: Thông báo & nhanh chóng (col-span-3) */}
        <div className="xl:col-span-3">
          <WidgetErrorBoundary title="Thông báo & nhanh chóng">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClockCircleOutlined className="text-[var(--color-warning)] text-base" />
                  <h2 className="text-[15px] font-bold text-slate-900 m-0">Thông báo & nhanh chóng</h2>
                </div>

                <div className="space-y-2.5">
                  {isLoadingNotifications ? <Skeleton active paragraph={{ rows: 3 }} /> : notificationsList.length ? notificationsList.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[var(--ceo-info-soft)] text-[var(--ceo-info)] flex items-center justify-center border border-[var(--ceo-divider)] shrink-0">
                          <LineChartOutlined className="text-sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{notif.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={notif.content}>{notif.content || formatDateTime(notif.createdAt)}</div>
                        </div>
                      </div>
                      <Link href={notif.linkUrl || '/dashboard'} className="shrink-0 pl-2 text-[var(--ceo-primary-700)]" aria-label={`Mở thông báo ${notif.title}`}>
                        <ArrowRightOutlined className="text-sm" />
                      </Link>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hệ thống vận hành ổn định, không có thông báo mới" />}
                </div>
              </div>

              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
              >
                <span>Xem tất cả thông báo</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <CeoDossiersTable
          latestDossiers={latestDossiers}
          isLoadingDossiers={isLoadingDossiers}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(380px,1.3fr)_minmax(300px,.9fr)]">
        <WidgetErrorBoundary title="Top khách hàng">
          <section className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
              <h2 className="text-[15px] font-bold text-slate-900">Top khách hàng</h2>
              <span className="text-xs text-slate-500">Đơn vị: Triệu đ</span>
            </div>
            <div className="flex-1">
              {isLoadingOverview ? <div className="p-4"><Skeleton active paragraph={{ rows: 5 }} /></div> : topCustomers.length ? (
                <div className="flex flex-col">
                  {topCustomers.map((customer, index) => (
                    <div key={`${customer.customerName}-${index}`} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0 transition-colors hover:bg-slate-50">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold ${customerLogoColors[index % customerLogoColors.length]}`}>
                          {customer.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">{customer.customerName}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">Hạng {index + 1}</div>
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                        {new Intl.NumberFormat('vi-VN').format(Math.round(Number(customer.spend) / 1_000_000))}Tr
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="p-6 text-center text-sm text-slate-500">Chưa có dữ liệu</div>}
            </div>
          </section>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Doanh thu Nhà cung cấp">
          <section className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary-soft-2)] bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]"><ShopOutlined /></div>
                  <h2 className="text-[15px] font-bold text-slate-900">Doanh thu Nhà cung cấp</h2>
                </div>
                <p className="ml-9 mt-1.5 text-[11px] text-slate-500">Xếp hạng theo chi phí thuần trong kỳ</p>
              </div>
              <span className="whitespace-nowrap text-[11px] text-slate-500">Top {supplierRows.length} NCC</span>
            </div>
            <div className="flex-1 p-4">
              {isLoadingOverview ? <Skeleton active paragraph={{ rows: 6 }} /> : supplierRows.length ? (
                <div className="space-y-4" role="list" aria-label="Doanh thu theo nhà cung cấp">
                  {supplierRows.map((supplier, index) => {
                    const share = supplierTotal > 0 ? (supplier.amount / supplierTotal) * 100 : 0;
                    const width = highestSupplierAmount > 0 ? (supplier.amount / highestSupplierAmount) * 100 : 0;
                    const barColor = index === 0 ? themeTokens.brand.primary[800] : index === 1 ? themeTokens.brand.primary[600] : themeTokens.brand.primary.hoverBorder;
                    return (
                      <div key={supplier.supplierId} role="listitem" className="group">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-600">{index + 1}</span>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-800">{supplier.supplierName}</div>
                              <div className="mt-0.5 truncate text-[10px] text-slate-500">{supplier.supplierCode} · {supplier.dossierCount} hồ sơ</div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[13px] font-bold tabular-nums text-slate-900">{new Intl.NumberFormat('vi-VN').format(Math.round(supplier.amount / 1_000_000))} Tr</div>
                            <div className="text-[10px] tabular-nums text-slate-500">{share.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${supplier.supplierName}: ${share.toFixed(1)}%`} aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full transition-all duration-300 group-hover:brightness-95" style={{ width: `${width}%`, backgroundColor: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
                  <ShopOutlined className="mb-2 text-2xl text-slate-400" />
                  <p className="text-sm text-slate-500">Chưa có dữ liệu nhà cung cấp trong kỳ</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-[11px] text-slate-600">Tổng nhóm đang hiển thị</span>
              <span className="text-sm font-bold tabular-nums text-[var(--color-primary-600)]">{new Intl.NumberFormat('vi-VN').format(Math.round(supplierTotal / 1_000_000))} Tr</span>
            </div>
          </section>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Báo cáo nhanh">
          <section className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="border-b border-[var(--color-border)] p-4">
              <h2 className="text-[15px] font-bold text-slate-900">Báo cáo nhanh</h2>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 p-4">
              {quickReports.map((report) => (
                <Link key={report.title} href={report.href} className="group flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition-colors hover:border-[var(--color-primary-soft-2)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${report.iconBox}`}>{report.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 group-hover:text-[var(--color-primary-600)]">{report.title}</span>
                  <RightOutlined className="shrink-0 text-[10px] text-slate-500 group-hover:text-[var(--color-primary-600)]" />
                </Link>
              ))}
            </div>
          </section>
        </WidgetErrorBoundary>
      </div>

    </div>
  );
}
