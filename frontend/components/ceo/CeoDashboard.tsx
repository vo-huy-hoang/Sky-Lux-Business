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
} from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FolderOpenOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
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




ChartJS.register(
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);



const STATUS_META: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: '#98A19D' },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: '#7C59C8' },
  RESUBMITTED: { label: 'Đã gửi lại', className: 'skylux-status-purple', color: '#7C59C8' },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: '#E39A16' },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple', color: '#2E82C4' },
  EDITING: { label: 'Đang sửa', className: 'skylux-status-warning', color: '#D48806' },
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


function formatCompactCurrency(value?: number | string) {
  return formatCurrency(value, { compact: true, showSymbol: false });
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
  icon,
  tone = 'green',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string; // Kept for compatibility, but not rendered in compact mode
  tone?: 'green' | 'gold' | 'blue' | 'purple';
  loading?: boolean;
}) {
  const toneClasses = {
    green: 'bg-[#E8F6ED] text-[#0A8A61] border-[#C8EBD5]',
    gold: 'bg-[#FFF2E8] text-[#D46B08] border-[#FFD8BF]',
    blue: 'bg-[#E6F7FF] text-[#0958D9] border-[#BAE0FF]',
    purple: 'bg-[#F9F0FF] text-[#531DAB] border-[#E8D0FF]',
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${toneClasses[tone]} [&_.anticon]:text-sm`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs text-slate-500 font-medium leading-tight line-clamp-2">{label}</span>
          <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
            {loading ? <Skeleton.Input active size="small" /> : value}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CeoDashboard() {

  const selectedYear = useFilterStore((state) => state.selectedYear);

  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
  } = useCeoDashboard({ periodType: 'MONTHLY' });

  const { data: dossierResponse, isLoading: isLoadingDossiers } = useQuery<{
    data: DossierItem[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 6 }),
    queryFn: ({ signal }) => dossiersService.getDossiers({ page: 1, limit: 6 }, { signal }),
  });

  const { data: monthlyTrend = [], isLoading: isLoadingTrend } = useCeoMonthlyTrend(selectedYear);
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
  const notificationsList = notificationsResponse?.data || [];
  const pendingApprovals = React.useMemo(
    () => [...(submittedApprovalsQuery.data?.data || []), ...(reviewingApprovalsQuery.data?.data || [])]
      .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime())
      .slice(0, 5),
    [reviewingApprovalsQuery.data?.data, submittedApprovalsQuery.data?.data],
  );
  const topSalesList = React.useMemo(
    () => [...salesSummary]
      .filter((sales) => Number(sales.totalRevenue) > 0)
      .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
      .slice(0, 5)
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

  const displayLineData = {
    labels: monthlyTrend.map((month: CeoMonthlyTrendItem) => month.label),
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: monthlyTrend.map((month: CeoMonthlyTrendItem) => Number(month.totalRevenue || 0) / 1_000_000),
        borderColor: '#104E35',
        backgroundColor: '#104E35',
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#104E35',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
      },
      {
        label: 'Lợi nhuận (đ)',
        data: monthlyTrend.map((month: CeoMonthlyTrendItem) => Number(month.totalProfit || 0) / 1_000_000),
        borderColor: '#D48B1E',
        backgroundColor: '#D48B1E',
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#D48B1E',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
      },
    ],
  };

  const displayLineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} tỷ đ`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#94A3B8', font: { size: 11, weight: 500 } },
      },
      y: {
        min: 0,
        suggestedMax: Math.ceil(maxMonthlyValue / 10) * 10,
        grid: { color: '#F1F5F9' },
        border: { display: false },
        ticks: {
          stepSize: 10,
          color: '#94A3B8',
          font: { size: 11, weight: 500 },
          callback: (value) => (value === 0 ? '0' : `${value}B`),
        },
      },
    },
  };

  const statusRows = [
    { key: 'DRAFT', label: 'Mới tạo' },
    { key: 'IN_REVIEW', label: 'Đang xử lý' },
    { key: 'SUBMITTED', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'COMPLETED', label: 'Đã hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' },
  ].map((row) => ({ ...row, count: funnelMap.get(row.key) || 0, color: statusMeta(row.key).color }));

  const dossierColumns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      width: 280,
      render: (value: string, record: DossierItem) => (
        <Link className="font-semibold text-[var(--ceo-primary-700)] whitespace-nowrap hover:underline" href={`/main/dossiers/${record.id}`}>
          {value}
        </Link>
      ),
    },
    {
      title: 'Khách hàng',
      width: 220,
      render: (_: unknown, record: DossierItem) => (
        <span className="truncate block" title={record.customer?.displayName || record.name}>
          {record.customer?.displayName || record.name}
        </span>
      ),
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
        <Col xs={24} sm={12} lg={6}>
          <MetricCard label="Tổng doanh thu tháng" value={formatCurrency(overview?.totalRevenue)} hint="Dữ liệu dự toán đã duyệt" icon={<DollarOutlined />} loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard label="Lợi nhuận tháng" value={formatCurrency(overview?.totalProfit)} hint="Theo lợi nhuận gộp trong hồ sơ" icon={<LineChartOutlined />} loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard label="Hồ sơ toàn hệ thống" value={totalDossiers} hint="Tổng theo trạng thái" icon={<FolderOpenOutlined />} tone="blue" loading={isLoadingOverview} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard label="Hồ sơ chờ duyệt" value={pendingCount} hint="Đã gửi và đang xem xét" icon={<ClockCircleOutlined />} tone="gold" loading={isLoadingOverview} />
        </Col>
      </Row>

      {/* 6 Cards in 3 Columns - Matching Target Design 100% (5 : 4 : 3 ratio) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* CARD 1: Doanh thu theo tháng (col-span-5) */}
        <div className="xl:col-span-5">
          <WidgetErrorBoundary title="Doanh thu theo tháng">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-slate-900">Doanh thu theo tháng</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
                      Năm {selectedYear}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-3.5 h-1.5 rounded-full bg-[#104E35]" />
                    <span>Doanh thu (đ)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-3.5 h-1.5 rounded-full bg-[#D48B1E]" />
                    <span>Lợi nhuận (đ)</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[215px] w-full">
                  {isLoadingTrend ? <Skeleton active paragraph={{ rows: 5 }} /> : monthlyTrend.length ? <Line data={displayLineData} options={displayLineOptions} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu doanh thu từ API" />}
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* CARD 2: Cơ cấu doanh thu theo cách phân loại (col-span-4) */}
        <div className="xl:col-span-4">
          <WidgetErrorBoundary title="Cơ cấu doanh thu theo cách phân loại">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="text-[15px] font-bold text-slate-900">Cơ cấu doanh thu theo {breakdownMode === 'MARKET_TYPE' ? 'loại hình' : 'mảng'}</div>
                  <RevenueBreakdownToggle value={breakdownMode} onChange={setBreakdownMode} />
                </div>

                {/* Body: Donut + Legend */}
                <div className="flex items-center justify-between gap-4 sm:gap-6 my-auto py-2">
                  {chartBreakdown.length ? (
                    <RevenueDonutChart
                      items={sortedChartBreakdown}
                      total={chartBreakdownTotal}
                      ariaLabel="Cơ cấu doanh thu theo cách phân loại"
                      className="w-[180px] h-[180px] 2xl:w-[195px] 2xl:h-[195px]"
                    />
                  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu doanh thu" />}

                  {/* Legend list */}
                  <div className="flex-1 space-y-3 min-w-0">
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

        {/* CARD 3: Hồ sơ theo trạng thái (col-span-3) */}
        <div className="xl:col-span-3">
          <WidgetErrorBoundary title="Hồ sơ theo trạng thái">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="text-[15px] font-bold text-slate-900 mb-1">Hồ sơ theo trạng thái</div>
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
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="text-[15px] font-bold text-slate-900 mb-3">Phê duyệt cần xử lý hôm nay</div>
                <div className="space-y-3">
                  {isLoadingApprovals ? <Skeleton active paragraph={{ rows: 5 }} /> : pendingApprovals.length ? pendingApprovals.map((item: EstimateItem) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 items-center gap-x-3 gap-y-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`w-[82px] shrink-0 px-1.5 py-0.5 rounded text-[10.5px] font-medium border text-center truncate ${item.status === EstimateStatus.IN_REVIEW ? 'bg-[#EBF5FB] text-[#2E82C4] border-[#D1E8F7]' : 'bg-[#FEF5E7] text-[#B7791F] border-[#FDE3B8]'}`}
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
                        <Link href="/main/approvals">
                          <button
                            type="button"
                            className="px-2.5 py-0.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:text-[#0B7A5B] hover:border-[#0B7A5B] bg-white transition-colors cursor-pointer"
                          >
                            Xem
                          </button>
                        </Link>
                      </div>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hồ sơ chờ duyệt từ API" />}
                </div>
              </div>

              <Link
                href="/main/approvals"
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[#0B7A5B] hover:text-[#08664D] transition-colors"
              >
                <span>Xem tất cả hồ sơ chờ duyệt</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* CARD 5: Top 5 Sales theo doanh thu (col-span-4) */}
        <div className="xl:col-span-4">
          <WidgetErrorBoundary title="Top 5 Sales theo doanh thu">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-bold text-slate-900">Top 5 Sales theo doanh thu</span>
                </div>

                <div className="space-y-3.5">
                  {isLoadingSales ? <Skeleton active paragraph={{ rows: 5 }} /> : topSalesList.length ? topSalesList.map((sales) => (
                    <div
                      key={sales.salesUserId}
                      className="grid grid-cols-[14px_24px_minmax(0,1.2fr)_minmax(35px,1fr)_auto] items-center gap-2 text-xs"
                    >
                      <span className={`font-bold text-xs ${sales.rank <= 3 ? 'text-amber-500' : 'text-slate-500'}`}>
                        {sales.rank}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-700)] flex items-center justify-center text-[10px] font-bold border border-slate-200 shrink-0">
                        {sales.salesUserName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="truncate text-slate-800 font-medium" title={sales.salesUserName}>
                        {sales.salesUserName}
                      </span>
                      <div className="h-1 bg-transparent flex items-center w-full">
                        <div className="h-0.75 bg-[#D48B1E] rounded-full" style={{ width: `${sales.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap text-right">
                        {formatCurrency(sales.totalRevenue)}
                      </span>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có doanh thu Sales từ API" />}
                </div>
              </div>

              <Link
                href="/main/reports"
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[#0B7A5B] hover:text-[#08664D] transition-colors"
              >
                <span>Xem bảng xếp hạng đầy đủ</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* CARD 6: Thông báo & nhanh chóng (col-span-3) */}
        <div className="xl:col-span-3">
          <WidgetErrorBoundary title="Thông báo & nhanh chóng">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 text-[15px] font-bold text-slate-900 mb-3">
                  <ClockCircleOutlined className="text-[#F59E0B] text-base" />
                  <span>Thông báo & nhanh chóng</span>
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
                      <Link href={notif.linkUrl || '/main/notifications'} className="shrink-0 pl-2 text-[var(--ceo-primary-700)]" aria-label={`Mở thông báo ${notif.title}`}>
                        <ArrowRightOutlined className="text-sm" />
                      </Link>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo từ API" />}
                </div>
              </div>

              <Link
                href="/main/notifications"
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[#0B7A5B] hover:text-[#08664D] transition-colors"
              >
                <span>Xem tất cả thông báo</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>
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
              scroll={{ x: 1080 }}
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
