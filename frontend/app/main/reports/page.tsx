'use client';

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChartOutlined,
  CustomerServiceOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useReport, useReportExport } from '@/hooks/use-reports';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { reportsService, reportTypeLabel } from '@/services/reports.service';
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

function money(value: unknown) {
  return `${new Intl.NumberFormat('vi-VN').format(numberValue(value))} đ`;
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
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [reportType, setReportType] = useState<ReportType>('revenue');
  const [dates, setDates] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [format, setFormat] = useState<ReportFormat>('XLSX');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 350);
  const canViewReports = hasPermission('report.view');
  const canExportReports = hasPermission('report.export');

  const queryParams = useMemo<ReportQueryParams>(
    () => ({
      periodStart: dates[0].format('YYYY-MM-DD'),
      periodEnd: dates[1].format('YYYY-MM-DD'),
      page,
      pageSize: 20,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [dates, page, debouncedSearch],
  );

  const reportQuery = useReport<ReportRow>(reportType, queryParams, {
    enabled: canViewReports,
  });
  const exportMutation = useReportExport();
  const savedReports = useQuery({
    queryKey: queryKeys.reports.saved({ page: 1, pageSize: 10 }),
    queryFn: ({ signal }) =>
      reportsService.getSaved({ page: 1, pageSize: 10 }, { signal }),
    enabled: canViewReports,
    staleTime: 60 * 1000,
  });

  const rows = (reportQuery.data?.data || []) as unknown as ReportRecord[];
  const summary = reportQuery.data?.meta.summary;
  const reportTitle = reportTypeLabel(reportType);

  const changeReportType = (nextReportType: ReportType) => {
    setPage(1);
    setReportType(nextReportType);
  };

  const changeDates = (nextDates: [Dayjs, Dayjs]) => {
    setPage(1);
    setDates(nextDates);
  };

  const changeSearch = (nextSearch: string) => {
    setPage(1);
    setSearchInput(nextSearch);
  };

  const columns = useMemo<ColumnsType<ReportRecord>>(() => {
    const right = { align: 'right' as const };
    if (reportType === 'revenue') {
      return [
        { title: 'Hồ sơ', dataIndex: 'dossierCode', render: (value: unknown) => value || '—' },
        { title: 'Khách hàng', dataIndex: 'customerName', render: (value: unknown) => value || '—' },
        { title: 'Sales', dataIndex: 'salesUserName', render: (value: unknown) => value || 'Chưa gán' },
        { title: 'Ngày ghi nhận', dataIndex: 'revenueRecognitionDate', render: dateLabel },
        { title: 'Doanh thu', dataIndex: 'revenueNet', render: money, ...right },
        { title: 'Chi phí', dataIndex: 'costNet', render: money, ...right },
        { title: 'Lợi nhuận', dataIndex: 'profit', render: money, ...right },
        { title: 'Còn phải thu', dataIndex: 'customerOutstanding', render: money, ...right },
      ];
    }
    if (reportType === 'sales-performance') {
      return [
        { title: 'Sales', dataIndex: 'salesUserName', render: (value: unknown) => value || '—' },
        { title: 'Mã NV', dataIndex: 'employeeCode', render: (value: unknown) => value || '—' },
        { title: 'Số hồ sơ', dataIndex: 'dossierCount', ...right },
        { title: 'Hồ sơ thành công', dataIndex: 'successfulDossierCount', ...right },
        { title: 'Tỷ lệ chốt', dataIndex: 'closeRate', render: (value) => `${numberValue(value).toFixed(2)}%`, ...right },
        { title: 'Doanh thu', dataIndex: 'revenueNet', render: money, ...right },
        { title: 'Lợi nhuận', dataIndex: 'profit', render: money, ...right },
      ];
    }
    if (reportType === 'customer') {
      return [
        { title: 'Mã KH', dataIndex: 'customerCode', render: (value: unknown) => value || '—' },
        { title: 'Khách hàng', dataIndex: 'customerName', render: (value: unknown) => value || '—' },
        { title: 'Loại', dataIndex: 'customerType', render: statusLabel },
        { title: 'Số hồ sơ', dataIndex: 'dossierCount', ...right },
        { title: 'Doanh thu', dataIndex: 'revenueNet', render: money, ...right },
        { title: 'Lợi nhuận', dataIndex: 'profit', render: money, ...right },
        { title: 'Còn phải thu', dataIndex: 'customerOutstanding', render: money, ...right },
      ];
    }
    return [
      { title: 'Mã NCC', dataIndex: 'supplierCode', render: (value: unknown) => value || '—' },
      { title: 'Nhà cung cấp', dataIndex: 'supplierName', render: (value: unknown) => value || '—' },
      { title: 'Trạng thái', dataIndex: 'supplierStatus', render: statusLabel },
      { title: 'Số hồ sơ', dataIndex: 'dossierCount', ...right },
      { title: 'Chi phí', dataIndex: 'costNet', render: money, ...right },
    ];
  }, [reportType]);

  const saveReport = async () => {
    try {
      await reportsService.createSaved({
        name: `${reportTitle} - ${dates[0].format('MM/YYYY')}`,
        reportType: reportType.toUpperCase(),
        filters: { ...queryParams },
      });
      await savedReports.refetch();
      messageApi.success('Đã lưu báo cáo');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Không thể lưu báo cáo');
    }
  };

  const exportReport = async (requestedFormat: ReportFormat) => {
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
            ...(queryParams.search ? { search: queryParams.search } : {}),
          },
        },
        filename: `skylux-${reportType}-${dates[0].format('YYYY-MM-DD')}.${requestedFormat.toLowerCase()}`,
      });
      messageApi.success(`Đã xuất báo cáo ${requestedFormat}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Không thể xuất báo cáo');
    }
  };

  return (
    <div className="space-y-4">
      {contextHolder}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reportTypes.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => changeReportType(type.key)}
            className={`cursor-pointer rounded-lg border bg-white p-4 text-left transition-colors ${reportType === type.key ? 'border-[var(--ceo-primary-700)] ring-2 ring-[rgb(11_107_79_/_0.08)]' : 'border-[var(--ceo-border)] hover:border-[var(--ceo-primary-700)]'}`}
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-4">
            <Card className="ceo-card" title="Bộ lọc báo cáo">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="block text-xs font-semibold">Loại báo cáo</span>
                  <Select
                    className="w-full"
                    value={reportType}
                    onChange={(value: ReportType) => changeReportType(value)}
                    options={reportTypes.map((type) => ({ label: type.label, value: type.key }))}
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-semibold">Khoảng thời gian</span>
                  <RangePicker
                    className="w-full"
                    value={dates}
                    onChange={(value) => value?.[0] && value?.[1] && changeDates([value[0], value[1]])}
                    format="DD/MM/YYYY"
                    allowClear={false}
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-semibold">Tìm kiếm</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => changeSearch(event.target.value)}
                    placeholder="Mã, tên khách hàng, nhà cung cấp..."
                    allowClear
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-semibold">Định dạng xuất</span>
                  <Select
                    className="w-full"
                    value={format}
                    onChange={(value: ReportFormat) => setFormat(value)}
                    options={[
                      { label: 'Excel (.xlsx)', value: 'XLSX' },
                      { label: 'CSV (.csv)', value: 'CSV' },
                      { label: 'PDF (.pdf)', value: 'PDF' },
                    ]}
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-semibold">Sales</span>
                  <Select className="w-full" value="ALL" disabled options={[{ label: 'Theo quyền truy cập', value: 'ALL' }]} />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-semibold">Phạm vi dữ liệu</span>
                  <Tag color="green" className="mt-1">Backend tự áp dụng RBAC</Tag>
                </label>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <Button
                  icon={<EyeOutlined />}
                  className="skylux-primary-button"
                  onClick={() => reportQuery.refetch()}
                  loading={reportQuery.isFetching}
                >
                  Xem trước
                </Button>
                <Button onClick={saveReport} disabled={savedReports.isFetching}>Lưu báo cáo</Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => exportReport(format === 'PDF' ? 'XLSX' : format)}
                  loading={exportMutation.isPending}
                  disabled={!canExportReports}
                >
                  Xuất {format === 'PDF' ? 'Excel' : format}
                </Button>
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => exportReport('PDF')}
                  loading={exportMutation.isPending}
                  disabled={!canExportReports}
                >
                  Xuất PDF
                </Button>
              </div>
            </Card>

            <Card
              className="ceo-card"
              title={`Xem trước: ${reportTitle}`}
              extra={<Text className="text-xs text-[var(--ceo-text-muted)]">{dates[0].format('DD/MM/YYYY')} - {dates[1].format('DD/MM/YYYY')}</Text>}
            >
              {reportQuery.isError ? (
                <Alert type="error" showIcon message="Không thể tải báo cáo" description={reportQuery.error instanceof Error ? reportQuery.error.message : 'Vui lòng thử lại sau.'} />
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-[var(--ceo-primary-soft)] p-3"><Text type="secondary">Doanh thu ròng</Text><div className="mt-1 text-lg font-bold text-[var(--ceo-primary-900)]">{money(summary?.revenueNet)}</div></div>
                    <div className="rounded-md bg-[var(--ceo-gold-soft)] p-3"><Text type="secondary">Chi phí ròng</Text><div className="mt-1 text-lg font-bold">{money(summary?.costNet)}</div></div>
                    <div className="rounded-md bg-[var(--ceo-primary-soft)] p-3"><Text type="secondary">Lợi nhuận</Text><div className="mt-1 text-lg font-bold text-[var(--ceo-primary-600)]">{money(summary?.profit)}</div></div>
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
                    scroll={{ x: 900 }}
                    className="ceo-table"
                    columns={columns}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu báo cáo" /> }}
                  />
                </>
              )}
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="ceo-card" title="Báo cáo đã lưu gần đây">
              {savedReports.isLoading ? (
                <div className="ceo-empty-panel min-h-[240px]">Đang tải...</div>
              ) : savedReports.data?.data?.length ? (
                <div className="space-y-2">
                  {savedReports.data.data.map((report) => (
                    <div key={report.id} className="rounded-md border border-[var(--ceo-divider)] p-3">
                      <div className="font-semibold">{report.name}</div>
                      <div className="mt-1 text-xs text-[var(--ceo-text-muted)]">{report.reportType} · {new Date(report.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ceo-empty-panel min-h-[240px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có báo cáo đã lưu" /></div>
              )}
            </Card>
            <Card className="ceo-card" title="Phạm vi báo cáo">
              <div className="space-y-2 text-sm text-[var(--ceo-text-muted)]">
                <p>Doanh thu được tính theo estimate đã duyệt và ngày ghi nhận doanh thu.</p>
                <p>Phạm vi Sales/Operator/CEO được backend áp dụng theo tenant và permission.</p>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
