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
import dayjs from 'dayjs';
import { utils, writeFile } from 'xlsx';




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

const customerLogoColors = [
  'bg-[#F97316] text-white',
  'bg-[#0284C7] text-white',
  'bg-[#059669] text-white',
  'bg-[#E11D48] text-white',
  'bg-[#1E293B] text-white',
];

function statusMeta(status?: string) {
  return STATUS_META[status || ''] || {
    label: status || 'Chưa xác định',
    className: 'skylux-status-info',
    color: '#65706B',
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

function MetricCard({
  label,
  value,
  icon,
  hint,
  tone = 'green',
  loading,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  tone?: 'green' | 'gold' | 'blue' | 'purple';
  loading?: boolean;
  href?: string;
}) {
  const toneClasses = {
    green: 'bg-[#E8F6ED] text-[#0A8A61] border-[#C8EBD5]',
    gold: 'bg-[#FFF2E8] text-[#D46B08] border-[#FFD8BF]',
    blue: 'bg-[#E6F7FF] text-[#0958D9] border-[#BAE0FF]',
    purple: 'bg-[#F9F0FF] text-[#531DAB] border-[#E8D0FF]',
  };

  const cardBody = (
    <div
      className={`bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 flex flex-col justify-between h-full transition-all duration-200 ${
        href ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 group' : ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${toneClasses[tone]} [&_.anticon]:text-sm transition-transform duration-200 ${
            href ? 'group-hover:scale-105' : ''
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium leading-tight line-clamp-2">
              {label}
            </span>
            {href && (
              <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 font-mono">
                ↗
              </span>
            )}
          </div>
          <div className="text-[15px] xl:text-[15.5px] font-bold text-slate-900 tabular-nums leading-snug mt-0.5 whitespace-nowrap">
            {loading ? <Skeleton.Input active size="small" /> : value}
          </div>
          {hint && (
            <div className="text-[11px] text-slate-400 mt-1 truncate font-normal">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full no-underline text-inherit" aria-label={`Xem chi tiết ${label}`}>
        {cardBody}
      </Link>
    );
  }

  return cardBody;
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
    { title: 'Báo cáo doanh thu chi tiết', icon: <FileTextOutlined />, iconBox: 'bg-[#E8F6ED] text-[#0A8A61] border-[#C8EBD5]', href: '/reports' },
    { title: 'Báo cáo lợi nhuận theo mảng', icon: <DollarOutlined />, iconBox: 'bg-[#FEF5E7] text-[#D97706] border-[#FDE3B8]', href: '/reports' },
    { title: 'Báo cáo công nợ phải thu', icon: <WalletOutlined />, iconBox: 'bg-[#EBF5FB] text-[#2E82C4] border-[#D1E8F7]', href: '/reports' },
    { title: 'Báo cáo theo thị trường', icon: <GlobalOutlined />, iconBox: 'bg-[#E8F6ED] text-[#0A8A61] border-[#C8EBD5]', href: '/reports' },
    { title: 'Báo cáo hiệu suất Sales', icon: <BarChartOutlined />, iconBox: 'bg-[#E6F8F6] text-[#0D9488] border-[#CCF0ED]', href: '/kpi' },
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

  const exportSummary = () => {
    const rows = [
      ['Chỉ số', allTime ? 'Tất cả thời gian' : `Tháng ${anchorDate.format('MM/YYYY')}`],
      ['Tổng doanh thu', overview?.totalRevenue || 0],
      ['Lợi nhuận', overview?.totalProfit || 0],
      ['Tổng hồ sơ', totalDossiers],
      ['Hồ sơ chờ duyệt', pendingCount],
      ...sortedChartBreakdown.map((item) => [item.name, Number(item.amount || 0)]),
    ];
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), 'Tổng quan');
    writeFile(workbook, `bang-dieu-khien-${allTime ? 'tat-ca-thoi-gian' : anchorDate.format('YYYY-MM')}.xlsx`);
  };

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
        <Link className="font-semibold text-[var(--ceo-primary-700)] whitespace-nowrap hover:underline" href={`/dossiers/${record.id}`}>
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
      <div className="rounded-xl border border-[#E5E8E6] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center">
            <div className="flex min-h-[56px] w-full max-w-[400px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:border-slate-300">
              <div className="flex min-w-0 items-center gap-2">
                <CalendarOutlined className="shrink-0 text-sm text-slate-500" />
                <div className="min-w-0">
                  <div className="text-[11px] leading-tight text-slate-600">Kỳ báo cáo</div>
                  <div className="flex items-center gap-1">
                    <Select
                      aria-label="Chế độ kỳ báo cáo"
                      value={allTime ? 'ALL_TIME' : 'MONTHLY'}
                      onChange={(value) => setAllTime(value === 'ALL_TIME')}
                      variant="borderless"
                      className="!w-[150px] !p-0 !text-sm [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-slate-800"
                      options={[
                        { value: 'MONTHLY', label: 'Theo tháng' },
                        { value: 'ALL_TIME', label: 'Tất cả thời gian' },
                      ]}
                    />
                    {!allTime && (
                      <DatePicker
                        picker="month"
                        value={anchorDate}
                        onChange={(value) => value && setDateString(value.startOf('month').format('YYYY-MM-DD'))}
                        format="MM/YYYY"
                        allowClear={false}
                        inputReadOnly
                        variant="borderless"
                        className="!w-[88px] !p-0 !text-sm !font-semibold [&_.ant-picker-input>input]:!cursor-pointer [&_.ant-picker-input>input]:!font-semibold [&_.ant-picker-input>input]:!text-slate-800"
                        aria-label="Kỳ báo cáo theo tháng"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-2.5">
            <Button icon={<FilePdfOutlined />} onClick={() => window.print()} className="!h-9 !rounded-lg !border-[#0B7A5B] !px-3.5 !font-semibold !text-[#0B7A5B] hover:!bg-[#E8F6ED]">
              Xuất PDF
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={exportSummary} className="!h-9 !rounded-lg !border-[#0F3D2E] !bg-[#0F3D2E] !px-3.5 !font-semibold !text-white hover:!border-[#0A2E22] hover:!bg-[#0A2E22]">
              Xuất Excel
            </Button>
          </div>
        </div>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label={allTime ? 'Tổng doanh thu' : `Doanh thu ${currentMonthLabel}`}
            value={formatCurrency(overview?.totalRevenue)}
            hint={revenueHint}
            icon={<DollarOutlined />}
            loading={isLoadingOverview}
            href="/revenue"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label={allTime ? 'Tổng lợi nhuận' : `Lợi nhuận ${currentMonthLabel}`}
            value={formatCurrency(overview?.totalProfit)}
            hint={profitHint}
            icon={<LineChartOutlined />}
            loading={isLoadingOverview}
            href="/revenue"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label="Hồ sơ toàn hệ thống"
            value={totalDossiers}
            hint="Tổng theo mọi trạng thái"
            icon={<FolderOpenOutlined />}
            tone="blue"
            loading={isLoadingOverview}
            href="/dossiers"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label="Hồ sơ chờ duyệt"
            value={pendingCount}
            hint={pendingCount > 0 ? 'Cần CEO xem xét và duyệt' : 'Không có hồ sơ tồn đọng'}
            icon={<ClockCircleOutlined />}
            tone="gold"
            loading={isLoadingOverview}
            href="/approvals"
          />
        </Col>
      </Row>

      {/* Dashboard charts use the full row in a balanced two-column layout. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Monthly revenue */}
        <div className="xl:col-span-6">
          <WidgetErrorBoundary title="Doanh thu theo tháng">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-slate-900 m-0">Doanh thu theo tháng</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700">
                      {allTime ? 'Tất cả thời gian' : `Năm ${selectedYear}`}
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
                  {isLoadingTrend ? <Skeleton active paragraph={{ rows: 5 }} /> : monthlyTrend.length ? <Line data={displayLineData} options={displayLineOptions} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa phát sinh doanh thu khóa sổ trong năm" />}
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* Revenue composition */}
        <div className="xl:col-span-6">
          <WidgetErrorBoundary title="Cơ cấu doanh thu theo cách phân loại">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
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
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
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
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
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
                        <Link href="/approvals">
                          <button
                            type="button"
                            className="px-2.5 py-0.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:text-[#0B7A5B] hover:border-[#0B7A5B] bg-white transition-colors cursor-pointer"
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
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[#0B7A5B] hover:text-[#08664D] transition-colors"
              >
                <span>Xem tất cả hồ sơ chờ duyệt</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>

        {/* Sales revenue ranking (col-span-4) */}
        <div className="xl:col-span-4">
          <WidgetErrorBoundary title="Doanh thu theo Sales">
            <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-slate-900 m-0">Top 5 Sales theo doanh thu</h2>
                </div>

                <div className="max-h-[520px] space-y-3.5 overflow-y-auto pr-1">
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
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa ghi nhận doanh số khóa sổ của Sales" />}
                </div>
              </div>

              <Link
                href="/reports"
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[#0B7A5B] hover:text-[#08664D] transition-colors"
              >
                <span>Xem báo cáo hiệu suất Sales</span>
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
                <div className="flex items-center gap-2 mb-3">
                  <ClockCircleOutlined className="text-[#F59E0B] text-base" />
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
                className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs font-semibold text-[#0B7A5B] hover:text-[#08664D] transition-colors"
              >
                <span>Xem tất cả thông báo</span>
                <ArrowRightOutlined className="text-[10px]" />
              </Link>
            </div>
          </WidgetErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <WidgetErrorBoundary title="Hồ sơ toàn hệ thống - Cập nhật gần nhất">
          <Card
            className="ceo-card"
            title="Hồ sơ toàn hệ thống - Cập nhật gần nhất"
            extra={<Button type="link" href="/dossiers">Xem tất cả</Button>}
          >
            <Table
              rowKey="id"
              dataSource={latestDossiers}
              columns={dossierColumns}
              loading={isLoadingDossiers}
              pagination={false}
              className="ceo-table"
              scroll={{ x: 1080 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ phát sinh gần đây" /> }}
            />
          </Card>
        </WidgetErrorBoundary>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(380px,1.3fr)_minmax(300px,.9fr)]">
        <WidgetErrorBoundary title="Top khách hàng">
          <section className="flex h-full flex-col rounded-xl border border-[#E5E8E6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-[#E5E8E6] p-4">
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
          <section className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E8E6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E8E6] p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#C8EBD5] bg-[#E8F6ED] text-[#0A8A61]"><ShopOutlined /></div>
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
                    const barColor = index === 0 ? '#104E35' : index === 1 ? '#2F7D61' : '#A8CDBB';
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
              <span className="text-sm font-bold tabular-nums text-[#0A8A61]">{new Intl.NumberFormat('vi-VN').format(Math.round(supplierTotal / 1_000_000))} Tr</span>
            </div>
          </section>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Báo cáo nhanh">
          <section className="flex h-full flex-col rounded-xl border border-[#E5E8E6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="border-b border-[#E5E8E6] p-4">
              <h2 className="text-[15px] font-bold text-slate-900">Báo cáo nhanh</h2>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 p-4">
              {quickReports.map((report) => (
                <Link key={report.title} href={report.href} className="group flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition-colors hover:border-[#C8EBD5] hover:bg-[#F3FAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A5B]">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${report.iconBox}`}>{report.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 group-hover:text-[#0A8A61]">{report.title}</span>
                  <RightOutlined className="shrink-0 text-[10px] text-slate-500 group-hover:text-[#0A8A61]" />
                </Link>
              ))}
            </div>
          </section>
        </WidgetErrorBoundary>
      </div>

    </div>
  );
}
