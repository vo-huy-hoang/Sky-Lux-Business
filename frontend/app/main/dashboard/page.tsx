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
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { dossiersService } from '@/services/dossiers.service';
import { DossierItem } from '@/types/dossier';
import { useOperatorDashboard, useSalesDashboard } from '@/hooks/dashboards';
import { useAuthStore } from '@/lib/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import dynamic from 'next/dynamic';



const CeoDashboard = dynamic(() => import('@/components/ceo/CeoDashboard'), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});
const OperatorDashboard = dynamic(() => import('@/components/operator/OperatorDashboard'), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, LineElement, PointElement);

const { Text } = Typography;

const statusConfig: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: '#2F80ED' },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: '#7C5CCB' },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: '#F59E0B' },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: '#007A55' },
  COMPLETED: { label: 'Thành công', className: 'skylux-status-valid', color: '#00543D' },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: '#D93737' },
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getStatus(status?: string) {
  return statusConfig[status || ''] || {
    label: status || 'Chưa rõ',
    className: 'skylux-status-info',
    color: '#6B7280',
  };
}

function buildDailyCounts(items: DossierItem[]) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date;
  });

  return days.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const count = items.filter((item) => item.createdAt?.slice(0, 10) === key).length;
    return {
      label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      count,
    };
  });
}

const taskStatusLabels: Record<string, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang xử lý',
  WAITING: 'Chờ phản hồi',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const subscribe = () => () => {};
const useIsClient = () => React.useSyncExternalStore(subscribe, () => true, () => false);

function RoleDashboard() {

  const isClient = useIsClient();
  const hasRole = useAuthStore((state) => state.hasRole);

  if (!isClient) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  const isCeoAdmin = hasRole('CEO_ADMIN') || hasRole('SUPER_ADMIN');
  const isOperator = hasRole('OPERATOR');

  if (isCeoAdmin) return <CeoDashboard />;
  if (isOperator) return <OperatorDashboard />;
  return <OperationalDashboard />;
}

function OperationalDashboard() {
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

  const dailyCounts = useMemo(() => buildDailyCounts(dossiers), [dossiers]);
  const statusCounts = useMemo(() => {
    return dossiers.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, [dossiers]);

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} hồ sơ`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#6B7280', font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#F0F0F0' },
        border: { display: false },
        ticks: { color: '#6B7280', precision: 0, font: { size: 12 } },
      },
    },
  };

  const barData = {
    labels: dailyCounts.map((item) => item.label),
    datasets: [
      {
        data: dailyCounts.map((item) => item.count),
        backgroundColor: '#007A55',
        borderRadius: 999,
        borderSkipped: false,
        barThickness: 18,
      },
    ],
  };

  const doughnutLabels = Object.keys(statusCounts);
  const doughnutData = {
    labels: doughnutLabels.map((status) => getStatus(status).label),
    datasets: [
      {
        data: doughnutLabels.map((status) => statusCounts[status]),
        backgroundColor: doughnutLabels.map((status) => getStatus(status).color),
        borderColor: '#FFFFFF',
        borderWidth: 4,
        hoverOffset: 4,
      },
    ],
  };

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 280,
      render: (code: string, record: DossierItem) => (
        record?.id ? (
          <Link href={`/main/dossiers/${record.id}`}>
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

  const isDashboardError = isDossierError || (isOperator ? isOperatorError : isSales ? isSalesError : false);

  if (isDashboardError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải Dashboard"
        description="Vui lòng kiểm tra lại kết nối hoặc tải lại trang."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <FolderOpenOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">
                  {isOperator ? 'Hồ sơ đang theo dõi' : 'Tổng hồ sơ'}
                </Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isLoadingDossiers || (isOperator && isLoadingOperator) ? (
                    <Skeleton.Input active size="small" />
                  ) : (
                    isOperator ? operatorDashboard?.activeDossiersCount ?? totalDossiers : totalDossiers
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
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]">
                <FileDoneOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">
                  {isOperator ? 'Hồ sơ cần ưu tiên' : 'Hồ sơ đang xử lý'}
                </Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isOperator ? (
                    isLoadingOperator ? <Skeleton.Input active size="small" /> : priorityCount
                  ) : (
                    isLoadingDossiers ? <Skeleton.Input active size="small" /> : processingCount
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
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <TeamOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">
                  {isOperator ? 'Công việc quá hạn' : 'Doanh thu báo giá'}
                </Text>
                <div className="mt-1 text-[26px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isOperator ? (
                    isLoadingOperator ? <Skeleton.Input active size="small" /> : (operatorDashboard?.overdueTasksCount || 0)
                  ) : (
                    isLoadingSales ? (
                      <Skeleton.Input active size="small" />
                    ) : salesDashboard?.revenue ? (
                      `${(salesDashboard.revenue / 1_000_000).toLocaleString('vi-VN')} Tr`
                    ) : (
                      '0 ₫'
                    )
                  )}
                </div>
                <div className={`mt-3 text-xs font-medium ${isOperator ? 'text-[var(--color-danger)]' : 'text-[var(--color-primary-600)]'}`}>
                  {isOperator ? 'Cần được xử lý kịp thời' : 'Báo giá đã được duyệt'}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]">
                <CheckCircleOutlined />
              </span>
              <div className="min-w-0 flex-1">
                <Text className="text-sm text-slate-500">Tỷ lệ hoàn tất</Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isLoadingDossiers ? <Skeleton.Input active size="small" /> : `${completionPercent}%`}
                </div>
                <Progress
                  percent={Math.min(completionPercent, 100)}
                  showInfo={false}
                  strokeColor="#0B7A5B"
                  railColor="#E5E8E6"
                  className="mt-3"
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <WidgetErrorBoundary title="Hồ sơ tạo theo ngày">
            <Card
              className="skylux-card h-full"
              title={<span className="font-bold text-slate-900">Hồ sơ tạo theo ngày</span>}
            >
              <div className="h-[288px]">
                {isLoadingDossiers ? (
                  <Skeleton active paragraph={{ rows: 8 }} />
                ) : dossiers.length ? (
                  <Bar data={barData} options={barOptions} />
                ) : (
                  <Empty description="Chưa có dữ liệu hồ sơ để hiển thị biểu đồ" />
                )}
              </div>
            </Card>
          </WidgetErrorBoundary>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <WidgetErrorBoundary title="Hồ sơ theo trạng thái">
            <Card
              className="skylux-card h-full"
              title={<span className="font-bold text-slate-900">Hồ sơ theo trạng thái</span>}
            >
              <div className="relative h-[260px]">
                {isLoadingDossiers ? (
                  <Skeleton active paragraph={{ rows: 6 }} />
                ) : doughnutLabels.length ? (
                  <>
                    <Doughnut
                      data={doughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '66%',
                        plugins: { legend: { display: false } },
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Tổng số</div>
                        <div className="text-3xl font-bold text-slate-900">{dossiers.length}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Empty description="Chưa có dữ liệu trạng thái" />
                )}
              </div>
              <div className="mt-4 space-y-2">
                {doughnutLabels.map((status) => {
                  const config = getStatus(status);
                  return (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: config.color }}
                        />
                        {config.label}
                      </span>
                      <span className="font-semibold text-slate-800">{statusCounts[status]}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </WidgetErrorBoundary>
        </Col>
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
            <Link href="/main/dossiers">
              <Button type="link" className="font-semibold text-[var(--color-primary-700)]">
                Xem tất cả hồ sơ <ArrowRightOutlined />
              </Button>
            </Link>
          }
        >
          <Table
            dataSource={dossiers.slice(0, 8)}
            columns={columns}
            rowKey="id"
            loading={isLoadingDossiers}
            pagination={false}
            className="skylux-table"
            scroll={{ x: 1020 }}
          />
        </Card>
      </WidgetErrorBoundary>


      <div className="flex justify-end">
        <Link href="/main/imports">
          <Button icon={<FileExcelOutlined />} className="skylux-outline-button">
            Import dự toán Excel
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default RoleDashboard;
