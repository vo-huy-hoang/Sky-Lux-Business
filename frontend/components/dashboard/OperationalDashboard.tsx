'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  FileExcelOutlined,
  FolderOpenOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { DossierItem } from '@/types/dossier';
import { useOperatorDashboard, useSalesDashboard } from '@/hooks/dashboards';
import { useAuthStore } from '@/lib/stores/auth-store';
import { themeTokens } from '@/lib/theme/tokens.config';
import { queryKeys } from '@/lib/query-keys';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import dynamic from 'next/dynamic';

const DossierOperationalCharts = dynamic(
  () => import('@/components/dossiers/DossierOperationalCharts'),
  {
    ssr: false,
    loading: () => (
      <>
        <Col xs={24} xl={14}>
          <Card className="skylux-card h-full">
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <Card className="skylux-card h-full">
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
      </>
    ),
  },
);

const { Text, Title } = Typography;

const statusConfig: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: themeTokens.semantic.info.main },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: themeTokens.semantic.purple.main },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: themeTokens.semantic.warning.main },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: themeTokens.brand.primary[700] },
  COMPLETED: { label: 'Thành công', className: 'skylux-status-valid', color: themeTokens.brand.primary[800] },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: themeTokens.semantic.danger.main },
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getStatus(status?: string) {
  return statusConfig[status || ''] || {
    label: status || 'Chưa rõ',
    className: 'skylux-status-info',
    color: themeTokens.neutral.textMuted,
  };
}

const taskStatusLabels: Record<string, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang xử lý',
  WAITING: 'Chờ phản hồi',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export function OperationalDashboard() {
  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole('OPERATOR');
  const isSales = hasRole('SALES');
  const isSuperAdmin = hasRole('SUPER_ADMIN') || hasRole('CEO_ADMIN');

  const {
    data: dossiersData,
    isLoading: isLoadingDossiers,
    isError: isDossierError,
  } = useQuery({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 100 }),
    queryFn: ({ signal }) => dossiersService.getDossiers({ page: 1, limit: 100 }, { signal }),
  });

  const {
    data: operatorDashboard,
    isLoading: isLoadingOperator,
    isError: isOperatorError,
  } = useOperatorDashboard(undefined, { enabled: isOperator || isSuperAdmin });

  const {
    data: salesDashboard,
    isLoading: isLoadingSales,
    isError: isSalesError,
  } = useSalesDashboard(undefined, { enabled: (isSales && !isOperator) || isSuperAdmin });

  const dossiers = useMemo(() => dossiersData?.data || [], [dossiersData?.data]);
  const totalDossiers = dossiersData?.meta?.total || 0;
  const processingCount = dossiers.filter((item) =>
    ['SUBMITTED', 'IN_REVIEW', 'DRAFT'].includes(item.status),
  ).length;
  const priorityCount =
    operatorDashboard?.priorityBreakdown?.reduce(
      (total, item) => total + item.count,
      0,
    ) || 0;
  const completedCount = dossiers.filter((item) =>
    ['APPROVED', 'COMPLETED'].includes(item.status),
  ).length;
  const completionPercent = totalDossiers
    ? Math.round((completedCount / Math.max(dossiers.length, 1)) * 100)
    : 0;

  const tasksBreakdown =
    operatorDashboard?.tasksBreakdown || salesDashboard?.tasksBreakdown || [];
  const isLoadingTasks = isOperator ? isLoadingOperator : isLoadingSales;

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 280,
      render: (code: string, record: DossierItem) => (
        record?.id ? (
          <Link href={`/dossiers/${record.id}`}>
            <Text strong className="whitespace-nowrap text-slate-900 hover:text-[var(--color-primary-700)] hover:underline cursor-pointer">
              {code}
            </Text>
          </Link>
        ) : (
          <Text strong className="whitespace-nowrap text-slate-900">{code}</Text>
        )
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 220,
      render: (_: unknown, record: DossierItem) => (
        <div className="flex flex-col min-w-0">
          <Text strong className="truncate block" title={record.customer?.displayName || record.name}>
            {record.customer?.displayName || record.name}
          </Text>
          <Text type="secondary" className="text-xs truncate block" title={record.route || '-'}>
            {record.route || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Ngày đi',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: formatDate,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        const config = getStatus(status);
        return <Tag className={config.className}>{config.label}</Tag>;
      },
    },
    {
      title: 'Sales',
      key: 'sales',
      width: 150,
      render: (_: unknown, record: DossierItem) => record.salesUser?.fullName || '-',
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 130,
      render: formatDate,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Title level={2} className="text-xl font-bold text-slate-900 tracking-tight !mb-0.5">
            {isOperator ? 'Bảng điều khiển Điều hành' : 'Bảng điều khiển Kinh doanh'}
          </Title>
          <Text type="secondary" className="text-xs">
            {isOperator
              ? 'Tổng quan trạng thái hồ sơ, tiến độ điều hành và phân công công việc'
              : 'Theo dõi hiệu suất bán hàng, trạng thái hồ sơ và tạo tour mới'}
          </Text>
        </div>
        <Link href="/imports">
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            className="skylux-primary-button"
          >
            + Tạo Tour mới từ Excel
          </Button>
        </Link>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-4">
              <FolderOpenOutlined className="text-2xl text-[var(--color-primary-700)] shrink-0" />
              <div>
                <Text className="text-sm text-[var(--color-text-muted)]">
                  {isOperator ? 'Hồ sơ đang theo dõi' : 'Tổng hồ sơ'}
                </Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)] font-mono tabular-nums">
                  {isLoadingDossiers || (isOperator && isLoadingOperator) ? (
                    <Skeleton.Input active size="small" />
                  ) : isOperator ? (
                    isOperatorError ? (
                      totalDossiers
                    ) : (
                      operatorDashboard?.activeDossiersCount ?? totalDossiers
                    )
                  ) : (
                    totalDossiers
                  )}
                </div>
                <div className="mt-3 text-xs font-medium text-[var(--color-primary-600)]">
                  {isOperator ? 'Hồ sơ cần điều hành' : 'Từ danh sách hồ sơ'}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-4">
              <FileDoneOutlined className="text-2xl text-[var(--color-gold)] shrink-0" />
              <div>
                <Text className="text-sm text-[var(--color-text-muted)]">
                  {isOperator ? 'Hồ sơ cần ưu tiên' : 'Hồ sơ đang xử lý'}
                </Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)] font-mono tabular-nums">
                  {isOperator ? (
                    isLoadingOperator ? (
                      <Skeleton.Input active size="small" />
                    ) : isOperatorError ? (
                      processingCount
                    ) : (
                      priorityCount
                    )
                  ) : isLoadingDossiers ? (
                    <Skeleton.Input active size="small" />
                  ) : (
                    processingCount
                  )}
                </div>
                <div className="mt-3 text-xs font-medium text-[var(--color-warning)]">
                  {isOperator ? 'Tổng các mức ưu tiên' : 'Trạng thái đang mở'}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-4">
              <TeamOutlined className="text-2xl text-[var(--color-primary-700)] shrink-0" />
              <div>
                <Text className="text-sm text-[var(--color-text-muted)]">
                  {isOperator ? 'Công việc quá hạn' : 'Doanh thu báo giá'}
                </Text>
                <div className="mt-1 text-[26px] font-bold leading-none text-[var(--color-primary-900)] font-mono tabular-nums">
                  {isOperator ? (
                    isLoadingOperator ? (
                      <Skeleton.Input active size="small" />
                    ) : isOperatorError ? (
                      <span className="text-xs font-normal text-slate-400 font-sans">Chưa có quyền xem thống kê này</span>
                    ) : (
                      operatorDashboard?.overdueTasksCount || 0
                    )
                  ) : (
                    isLoadingSales ? (
                      <Skeleton.Input active size="small" />
                    ) : isSalesError ? (
                      <span className="text-xs font-normal text-slate-400 font-sans">Chưa có quyền xem thống kê này</span>
                    ) : salesDashboard?.revenue ? (
                      `${(salesDashboard.revenue / 1_000_000).toLocaleString('vi-VN')} Tr`
                    ) : (
                      '0 ₫'
                    )
                  )}
                </div>
                <div
                  className={`mt-3 text-xs font-medium ${
                    isOperator
                      ? isOperatorError
                        ? 'text-slate-400'
                        : 'text-[var(--color-danger)]'
                      : isSalesError
                        ? 'text-slate-400'
                        : 'text-[var(--color-primary-600)]'
                  }`}
                >
                  {isOperator
                    ? isOperatorError
                      ? 'Yêu cầu quyền dashboard.operator'
                      : 'Cần được xử lý kịp thời'
                    : isSalesError
                      ? 'Yêu cầu quyền dashboard.sales'
                      : 'Báo giá đã được duyệt'}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-4">
              <CheckCircleOutlined className="text-2xl text-[var(--color-gold)] shrink-0" />
              <div className="min-w-0 flex-1">
                <Text className="text-sm text-[var(--color-text-muted)]">Tỷ lệ hoàn tất</Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)] font-mono tabular-nums">
                  {isLoadingDossiers ? <Skeleton.Input active size="small" /> : `${completionPercent}%`}
                </div>
                <Progress
                  percent={Math.min(completionPercent, 100)}
                  showInfo={false}
                  strokeColor={themeTokens.brand.primary[600]}
                  railColor={themeTokens.neutral.border}
                  className="mt-3"
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <DossierOperationalCharts dossiers={dossiers} isLoadingDossiers={isLoadingDossiers} />
        <Col xs={24} md={12} xl={5}>
          <WidgetErrorBoundary title="Tình trạng công việc">
            <Card
              className="skylux-card h-full"
              title={<span className="font-bold text-slate-900">Tình trạng công việc</span>}
            >
              {isLoadingTasks ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : tasksBreakdown.length ? (
                <div className="space-y-3 pt-1">
                  {tasksBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 last:border-b-0">
                      <span className="text-sm text-[var(--color-text-muted)]">{taskStatusLabels[item.status] || item.status}</span>
                      <span className="text-base font-bold tabular-nums text-[var(--color-primary-900)]">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Chưa có dữ liệu công việc phát sinh" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </WidgetErrorBoundary>
        </Col>
      </Row>

      <WidgetErrorBoundary title="Hồ sơ gần đây">
        <Card
          className="skylux-card"
          title={<span className="font-bold text-slate-900">Hồ sơ gần đây</span>}
          extra={
            <Link href="/dossiers">
              <Button type="link" className="font-semibold text-[var(--color-primary-700)]">
                Xem tất cả hồ sơ <ArrowRightOutlined />
              </Button>
            </Link>
          }
        >
          {isDossierError ? (
            <Alert
              type="warning"
              showIcon
              title="Không thể tải danh sách hồ sơ"
              description="Vui lòng kiểm tra lại quyền truy cập hoặc thử tải lại trang."
              className="m-4"
            />
          ) : (
            <Table
              dataSource={dossiers.slice(0, 8)}
              columns={columns}
              rowKey="id"
              loading={isLoadingDossiers}
              pagination={false}
              className="skylux-table"
              scroll={{ x: 1020 }}
            />
          )}
        </Card>
      </WidgetErrorBoundary>

      <div className="flex justify-end">
        <Link href="/imports">
          <Button
            icon={<FileExcelOutlined />}
            type={isSales ? 'primary' : 'default'}
            className={isSales ? 'skylux-primary-button' : 'skylux-outline-button'}
          >
            {isSales ? '+ Tạo Tour mới từ Excel' : 'Import dự toán Excel'}
          </Button>
        </Link>
      </div>
    </div>
  );
}
