'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Popconfirm,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChartOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useReport,
  useReportExport,
  useReportMutations,
  useSavedReports,
} from '@/hooks/use-reports';
import { useUsersList } from '@/hooks/use-users';
import { formatCurrency } from '@/lib/financial-calculations';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useReportStore } from '@/lib/stores/report-store';
import { reportTypeLabel, SavedReport } from '@/services/reports.service';
import type {
  ReportFormat,
  ReportQueryParams,
  ReportRow,
  ReportType,
} from '@/types/report';

const { RangePicker } = DatePicker;
const { Text } = Typography;
type ReportRecord = Record<string, unknown>;

const reportTypes: Array<{
  key: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'revenue',
    label: 'Doanh thu',
    description: 'Doanh thu, chi phí, lợi nhuận và công nợ theo hồ sơ',
    icon: <BarChartOutlined />,
  },
  {
    key: 'sales-performance',
    label: 'Hiệu suất Sales',
    description: 'Số hồ sơ, tỷ lệ chốt và kết quả theo Sales',
    icon: <TeamOutlined />,
  },
  {
    key: 'customer',
    label: 'Khách hàng',
    description: 'Tổng hợp doanh thu và lợi nhuận theo khách hàng',
    icon: <CustomerServiceOutlined />,
  },
  {
    key: 'supplier',
    label: 'Nhà cung cấp',
    description: 'Tổng hợp chi phí theo nhà cung cấp',
    icon: <WalletOutlined />,
  },
];

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : Number(value || 0);
}

function money(value: unknown, currency?: unknown) {
  const curr = typeof currency === 'string' && currency.trim() ? currency.trim() : 'VND';
  return formatCurrency(numberValue(value), curr);
}

function dateLabel(value: unknown) {
  return value ? dayjs(String(value)).format('DD/MM/YYYY') : '—';
}

function statusLabel(value: unknown) {
  return value ? String(value).replaceAll('_', ' ') : '—';
}

function rowKey(row: ReportRecord) {
  return String(
    row.dossierId || row.salesUserId || row.customerId || row.supplierId,
  );
}

export default function ReportsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);

  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);

  const reportType = useReportStore((state) => state.reportType);
  const periodStart = useReportStore((state) => state.periodStart);
  const periodEnd = useReportStore((state) => state.periodEnd);
  const salesUserId = useReportStore((state) => state.salesUserId);
  const searchInput = useReportStore((state) => state.searchInput);
  const page = useReportStore((state) => state.page);
  const pageSize = useReportStore((state) => state.pageSize);

  const setReportType = useReportStore((state) => state.setReportType);
  const setDateRange = useReportStore((state) => state.setDateRange);
  const setSalesUserId = useReportStore((state) => state.setSalesUserId);
  const setSearchInput = useReportStore((state) => state.setSearchInput);
  const setPage = useReportStore((state) => state.setPage);
  const applySavedFilters = useReportStore((state) => state.applySavedFilters);

  const debouncedSearch = useDebounce(searchInput, 350);
  const canViewReports = hasPermission('report.view');
  const canExportReports = hasPermission('report.export');
  const canFilterSales =
    hasPermission('report.view.all') ||
    hasRole(['SUPER_ADMIN', 'CEO_ADMIN', 'ACCOUNTANT']);

  const dates = useMemo<[Dayjs, Dayjs]>(
    () => [dayjs(periodStart), dayjs(periodEnd)],
    [periodStart, periodEnd],
  );

  const queryParams = useMemo<ReportQueryParams>(
    () => ({
      periodStart,
      periodEnd,
      page,
      pageSize,
      ...(salesUserId ? { userId: salesUserId } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [periodStart, periodEnd, page, pageSize, salesUserId, debouncedSearch],
  );

  const reportQuery = useReport<ReportRow>(reportType, queryParams, {
    enabled: canViewReports,
  });

  const exportMutation = useReportExport();
  const savedReports = useSavedReports(
    { page: 1, pageSize: 20 },
    { enabled: canViewReports },
  );
  const { createSavedMutation, deleteSavedMutation, isCreatingSaved, isDeletingSaved } =
    useReportMutations();

  const usersQuery = useUsersList(
    { pageSize: 100, status: 'ACTIVE' },
    { enabled: canViewReports && canFilterSales },
  );

  const salesOptions = useMemo(() => {
    const base = [{ label: 'Tất cả nhân viên (Toàn quyền)', value: 'ALL' }];
    if (!usersQuery.users?.length) return base;
    return [
      ...base,
      ...usersQuery.users.map((u) => ({
        label: `${u.fullName} (${u.employeeCode || u.email})`,
        value: u.id,
      })),
    ];
  }, [usersQuery.users]);

  const rows = (reportQuery.data?.data || []) as unknown as ReportRecord[];
  const summary = reportQuery.data?.meta.summary;
  const reportTitle = reportTypeLabel(reportType);
  const savedCount = savedReports.data?.data?.length || 0;

  const columns = useMemo<ColumnsType<ReportRecord>>(() => {
    const right = { align: 'right' as const };
    if (reportType === 'revenue') {
      return [
        {
          title: 'Hồ sơ',
          dataIndex: 'dossierCode',
          render: (value: unknown, record: ReportRecord) => {
            const code = String(value || '—');
            const dossierId = record.dossierId as string | undefined;
            if (!dossierId) return code;
            return (
              <Link
                href={`/main/dossiers/${dossierId}`}
                className="font-semibold text-[var(--ceo-primary-700)] hover:underline"
              >
                {code}
              </Link>
            );
          },
        },
        {
          title: 'Khách hàng',
          dataIndex: 'customerName',
          render: (value: unknown) => value || '—',
        },
        {
          title: 'Sales',
          dataIndex: 'salesUserName',
          render: (value: unknown) => value || 'Chưa gán',
        },
        {
          title: 'Ngày khóa hồ sơ',
          dataIndex: 'lockedAt',
          render: dateLabel,
        },
        {
          title: 'Doanh thu',
          dataIndex: 'revenueNet',
          render: (value: unknown, record: ReportRecord) =>
            money(value, record.currency),
          ...right,
        },
        {
          title: 'Chi phí',
          dataIndex: 'costNet',
          render: (value: unknown, record: ReportRecord) =>
            money(value, record.currency),
          ...right,
        },
        {
          title: 'Lợi nhuận',
          dataIndex: 'profit',
          render: (value: unknown, record: ReportRecord) =>
            money(value, record.currency),
          ...right,
        },
        {
          title: 'Còn phải thu',
          dataIndex: 'customerOutstanding',
          render: (value: unknown, record: ReportRecord) =>
            money(value, record.currency),
          ...right,
        },
      ];
    }
    if (reportType === 'sales-performance') {
      return [
        {
          title: 'Sales',
          dataIndex: 'salesUserName',
          render: (value: unknown) => value || '—',
        },
        {
          title: 'Mã NV',
          dataIndex: 'employeeCode',
          render: (value: unknown) => value || '—',
        },
        { title: 'Số hồ sơ', dataIndex: 'dossierCount', ...right },
        {
          title: 'Hồ sơ thành công',
          dataIndex: 'successfulDossierCount',
          ...right,
        },
        {
          title: 'Tỷ lệ chốt',
          dataIndex: 'closeRate',
          render: (value) => `${numberValue(value).toFixed(2)}%`,
          ...right,
        },
        {
          title: 'Doanh thu',
          dataIndex: 'revenueNet',
          render: (val) => money(val),
          ...right,
        },
        {
          title: 'Lợi nhuận',
          dataIndex: 'profit',
          render: (val) => money(val),
          ...right,
        },
      ];
    }
    if (reportType === 'customer') {
      return [
        {
          title: 'Mã KH',
          dataIndex: 'customerCode',
          render: (value: unknown) => value || '—',
        },
        {
          title: 'Khách hàng',
          dataIndex: 'customerName',
          render: (value: unknown) => value || '—',
        },
        { title: 'Loại', dataIndex: 'customerType', render: statusLabel },
        { title: 'Số hồ sơ', dataIndex: 'dossierCount', ...right },
        {
          title: 'Doanh thu',
          dataIndex: 'revenueNet',
          render: (val) => money(val),
          ...right,
        },
        {
          title: 'Lợi nhuận',
          dataIndex: 'profit',
          render: (val) => money(val),
          ...right,
        },
        {
          title: 'Còn phải thu',
          dataIndex: 'customerOutstanding',
          render: (val) => money(val),
          ...right,
        },
      ];
    }
    return [
      {
        title: 'Mã NCC',
        dataIndex: 'supplierCode',
        render: (value: unknown) => value || '—',
      },
      {
        title: 'Nhà cung cấp',
        dataIndex: 'supplierName',
        render: (value: unknown) => value || '—',
      },
      { title: 'Trạng thái', dataIndex: 'supplierStatus', render: statusLabel },
      { title: 'Số hồ sơ', dataIndex: 'dossierCount', ...right },
      {
        title: 'Chi phí',
        dataIndex: 'costNet',
        render: (val) => money(val),
        ...right,
      },
    ];
  }, [reportType]);

  const handleSaveReport = async () => {
    let rangeLabel = `${dates[0].format('DD/MM/YYYY')} - ${dates[1].format('DD/MM/YYYY')}`;
    if (periodStart.endsWith('-01-01') && periodEnd.endsWith('-12-31') && dates[0].year() === dates[1].year()) {
      rangeLabel = `Năm ${dates[0].year()}`;
    } else if (
      dates[0].isSame(dates[0].startOf('month'), 'day') &&
      dates[1].isSame(dates[1].endOf('month'), 'day') &&
      dates[0].month() === dates[1].month()
    ) {
      rangeLabel = `Tháng ${dates[0].format('MM/YYYY')}`;
    }

    try {
      await createSavedMutation.mutateAsync({
        name: `${reportTitle} - ${rangeLabel}`,
        reportType: reportType.toUpperCase(),
        filters: { ...queryParams },
      });
      messageApi.success('Đã lưu báo cáo thành công');
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : 'Không thể lưu báo cáo',
      );
    }
  };

  const handleExport = async (requestedFormat: ReportFormat) => {
    if (!canExportReports) {
      messageApi.warning('Bạn không có quyền xuất báo cáo');
      return;
    }
    try {
      await exportMutation.mutateAsync({
        payload: {
          reportType,
          format: requestedFormat,
          filters: {
            periodStart: queryParams.periodStart,
            periodEnd: queryParams.periodEnd,
            ...(queryParams.userId ? { userId: queryParams.userId } : {}),
            ...(queryParams.search ? { search: queryParams.search } : {}),
          },
        },
        filename: `skylux-${reportType}-${dates[0].format('YYYYMMDD')}-${dates[1].format('YYYYMMDD')}.${requestedFormat.toLowerCase()}`,
      });
      messageApi.success(`Đã xuất báo cáo ${requestedFormat}`);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : 'Không thể xuất báo cáo',
      );
    }
  };

  const handleApplySavedReport = (saved: SavedReport) => {
    if (saved.reportType) {
      const type = saved.reportType.toLowerCase() as ReportType;
      if (['revenue', 'sales-performance', 'customer', 'supplier'].includes(type)) {
        setReportType(type);
      }
    }
    if (saved.filters) {
      applySavedFilters(saved.filters);
    }
    setIsSavedDrawerOpen(false);
    messageApi.info(`Đã áp dụng bộ lọc: ${saved.name}`);
  };

  return (
    <div className="space-y-4">
      {contextHolder}

      {/* 1. Header Grid 4 Loại Báo Cáo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reportTypes.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => setReportType(type.key)}
            className={`cursor-pointer rounded-lg border bg-white p-4 text-left transition-colors ${
              reportType === type.key
                ? 'border-[var(--ceo-primary-700)] ring-2 ring-[rgb(11_107_79_/_0.08)]'
                : 'border-[var(--ceo-border)] hover:border-[var(--ceo-primary-700)]'
            }`}
          >
            <span className="ceo-metric-icon mb-3 bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]">
              {type.icon}
            </span>
            <span className="block text-sm font-bold">{type.label}</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--ceo-text-muted)]">
              {type.description}
            </span>
          </button>
        ))}
      </div>

      {!canViewReports ? (
        <Card className="ceo-card">
          <Empty description="Bạn không có quyền xem báo cáo" />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 2. Bộ Lọc Báo Cáo Tinh Gọn Full-Width */}
          <Card className="ceo-card" title="Bộ lọc báo cáo">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="block text-xs font-semibold">Loại báo cáo</span>
                <Select
                  className="w-full"
                  value={reportType}
                  onChange={(value: ReportType) => setReportType(value)}
                  options={reportTypes.map((type) => ({
                    label: type.label,
                    value: type.key,
                  }))}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-semibold">Khoảng thời gian</span>
                <RangePicker
                  className="w-full"
                  value={dates}
                  onChange={(value) =>
                    value?.[0] &&
                    value?.[1] &&
                    setDateRange(
                      value[0].format('YYYY-MM-DD'),
                      value[1].format('YYYY-MM-DD'),
                    )
                  }
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-xs font-semibold">Nhân viên Sales</span>
                <Select
                  className="w-full"
                  value={salesUserId || 'ALL'}
                  disabled={!canFilterSales}
                  onChange={(value) => setSalesUserId(value)}
                  options={salesOptions}
                  loading={usersQuery.isLoading}
                  placeholder="Lọc theo nhân viên Sales"
                />
              </label>

              <label className="space-y-2 md:col-span-2 xl:col-span-2">
                <span className="block text-xs font-semibold">Tìm kiếm từ khóa</span>
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Mã hồ sơ, tên khách hàng, mã NCC..."
                  allowClear
                />
              </label>

              <div className="space-y-2">
                <span className="block text-xs font-semibold">Phạm vi bảo mật</span>
                <Tag color="green" className="mt-1 py-1">
                  {canFilterSales
                    ? 'Toàn quyền công ty (CEO / Admin)'
                    : 'Backend tự giới hạn theo RBAC cá nhân'}
                </Tag>
              </div>
            </div>

            {/* Thanh Nút Thao Tác Sạch Đẹp & Sang Trọng */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--ceo-divider)] pt-4">
              <Button
                icon={<EyeOutlined />}
                className="skylux-primary-button"
                onClick={() => reportQuery.refetch()}
                loading={reportQuery.isFetching}
              >
                Xem trước
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveReport}
                loading={isCreatingSaved}
              >
                Lưu bộ lọc
              </Button>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => setIsSavedDrawerOpen(true)}
              >
                Báo cáo đã lưu ({savedCount})
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => handleExport('XLSX')}
                loading={exportMutation.isPending && exportMutation.variables?.payload.format === 'XLSX'}
                disabled={!canExportReports}
              >
                Xuất Excel (.xlsx)
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handleExport('PDF')}
                loading={exportMutation.isPending && exportMutation.variables?.payload.format === 'PDF'}
                disabled={!canExportReports}
              >
                Xuất PDF (.pdf)
              </Button>
            </div>
          </Card>

          {/* 3. Bảng Dữ Liệu Xem Trước 100% Full-Width */}
          <Card
            className="ceo-card w-full"
            title={
              <div className="flex items-center gap-2">
                <span>Xem trước: {reportTitle}</span>
                <Tooltip title="Doanh thu và chi phí được kết chuyển theo ngày kết thúc tour (Chuẩn mực VAS 14 / IFRS 15), chỉ tổng hợp các hồ sơ có dự toán đã duyệt.">
                  <InfoCircleOutlined className="cursor-pointer text-sm text-[var(--ceo-text-muted)] hover:text-[var(--ceo-primary-700)]" />
                </Tooltip>
              </div>
            }
            extra={
              <Text className="text-xs text-[var(--ceo-text-muted)]">
                Kỳ lọc: {dates[0].format('DD/MM/YYYY')} - {dates[1].format('DD/MM/YYYY')}
              </Text>
            }
          >
            {reportQuery.isError ? (
              <Alert
                type="error"
                showIcon
                message="Không thể tải báo cáo"
                description={
                  reportQuery.error instanceof Error
                    ? reportQuery.error.message
                    : 'Vui lòng thử lại sau.'
                }
              />
            ) : (
              <>
                <div className="space-y-2 text-sm text-[var(--ceo-text-muted)] mb-4">
                  <p>Doanh thu được tính theo estimate đã duyệt và ngày khóa hồ sơ.</p>
                  <p>Phạm vi Sales/Operator/CEO được backend áp dụng theo tenant và permission.</p>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-[var(--ceo-primary-soft)] p-3">
                    <Text type="secondary">Doanh thu ròng</Text>
                    <div className="mt-1 text-lg font-bold text-[var(--ceo-primary-900)]">
                      {money(summary?.revenueNet)}
                    </div>
                  </div>
                  <div className="rounded-md bg-[var(--ceo-gold-soft)] p-3">
                    <Text type="secondary">Chi phí ròng</Text>
                    <div className="mt-1 text-lg font-bold">
                      {money(summary?.costNet)}
                    </div>
                  </div>
                  <div className="rounded-md bg-[var(--ceo-primary-soft)] p-3">
                    <Text type="secondary">Lợi nhuận</Text>
                    <div className="mt-1 text-lg font-bold text-[var(--ceo-primary-600)]">
                      {money(summary?.profit)}
                    </div>
                  </div>
                </div>

                <Table<ReportRecord>
                  rowKey={rowKey}
                  dataSource={rows}
                  loading={reportQuery.isLoading || reportQuery.isFetching}
                  pagination={{
                    current: reportQuery.data?.meta.page || page,
                    pageSize: reportQuery.data?.meta.pageSize || 20,
                    total: reportQuery.data?.meta.total || 0,
                    showSizeChanger: false,
                    onChange: (nextPage) => setPage(nextPage),
                  }}
                  scroll={{ x: 1000 }}
                  className="ceo-table"
                  columns={columns}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có tour nào kết thúc trong khoảng thời gian đã chọn"
                      />
                    ),
                  }}
                />
              </>
            )}
          </Card>
        </div>
      )}

      {/* 4. Drawer Báo Cáo Đã Lưu (Ngăn kéo sang trọng, không chiếm dụng diện tích) */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <FolderOpenOutlined className="text-[var(--ceo-primary-700)]" />
            <span>Báo cáo đã lưu ({savedCount})</span>
          </div>
        }
        placement="right"
        size={420}
        open={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
      >
        {savedReports.isLoading ? (
          <div className="ceo-empty-panel min-h-[200px]">Đang tải...</div>
        ) : savedReports.data?.data?.length ? (
          <div className="space-y-3">
            {savedReports.data.data.map((report) => (
              <div
                key={report.id}
                onClick={() => handleApplySavedReport(report)}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-[var(--ceo-divider)] p-3.5 transition-all hover:border-[var(--ceo-primary-700)] hover:bg-[var(--ceo-primary-soft)] hover:shadow-sm"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate font-semibold text-sm group-hover:text-[var(--ceo-primary-700)]">
                    {report.name}
                  </div>
                  <div className="mt-1 text-xs text-[var(--ceo-text-muted)]">
                    {reportTypeLabel(
                      (report.reportType?.toLowerCase() || 'revenue') as ReportType,
                    )}{' '}
                    · Lưu ngày {dayjs(report.createdAt).format('DD/MM/YYYY')}
                  </div>
                </div>
                <Popconfirm
                  title="Xóa bộ lọc này?"
                  description="Bạn có chắc muốn xóa báo cáo đã lưu này?"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    deleteSavedMutation.mutate(report.id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    loading={
                      isDeletingSaved &&
                      deleteSavedMutation.variables === report.id
                    }
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Popconfirm>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có báo cáo đã lưu nào"
          />
        )}
      </Drawer>
    </div>
  );
}
