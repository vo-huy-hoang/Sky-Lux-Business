'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDossiersList } from '@/hooks/dossiers';
import { DossierItem } from '@/types/dossier';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useDebounce } from '@/hooks/use-debounce';

const { Title, Text } = Typography;

const statusOptions = [
  { label: 'Tất cả', value: '' },
  { label: 'Mới nhập', value: 'DRAFT' },
  { label: 'Đã gửi', value: 'SUBMITTED' },
  { label: 'Đã gửi lại', value: 'RESUBMITTED' },
  { label: 'Đang xử lý', value: 'IN_REVIEW' },
  { label: 'Đang sửa', value: 'EDITING' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Thành công', value: 'COMPLETED' },
  { label: 'Đã khóa', value: 'LOCKED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];

const priorityOptions = [
  { label: 'Tất cả', value: '' },
  { label: 'Cao', value: 'HIGH' },
  { label: 'Trung bình', value: 'MEDIUM' },
  { label: 'Thấp', value: 'LOW' },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info' },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple' },
  RESUBMITTED: { label: 'Đã gửi lại', className: 'skylux-status-purple' },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning' },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid' },
  COMPLETED: { label: 'Thành công', className: 'skylux-status-valid' },
  LOCKED: { label: 'Đã khóa', className: 'skylux-status-danger' },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger' },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple' },
  EDITING: { label: 'Đang sửa', className: 'skylux-status-warning' },
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compactDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getStatus(status?: string) {
  return statusConfig[status || ''] || {
    label: status || 'Chưa rõ',
    className: 'skylux-status-info',
  };
}

function DossiersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesUserId = searchParams.get('salesUserId') || undefined;
  const statusParam = searchParams.get('status') || undefined;
  const priorityParam = searchParams.get('priority') || undefined;

  const hasRole = useAuthStore((state) => state.hasRole);
  const isCeoAdmin = hasRole(['CEO_ADMIN', 'SUPER_ADMIN']);
  const isOperator = hasRole('OPERATOR');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState<string | undefined>(statusParam);
  const [prevStatusParam, setPrevStatusParam] = useState(statusParam);
  if (statusParam !== prevStatusParam) {
    setPrevStatusParam(statusParam);
    setStatus(statusParam);
  }

  const [priority, setPriority] = useState<string | undefined>(priorityParam);
  const [prevPriorityParam, setPrevPriorityParam] = useState(priorityParam);
  if (priorityParam !== prevPriorityParam) {
    setPrevPriorityParam(priorityParam);
    setPriority(priorityParam);
  }

  const { data, isLoading, refetch } = useDossiersList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    salesUserId: salesUserId || undefined,
  });

  const summary = useMemo(() => {
    const legacyData = data as (typeof data & {
      items?: DossierItem[];
      total?: number;
    }) | undefined;
    const items = data?.data || legacyData?.items || [];
    return {
      total: data?.meta?.total ?? legacyData?.total ?? 0,
      waiting: items.filter((item: DossierItem) => ['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(item.status)).length,
      approved: items.filter((item: DossierItem) => ['APPROVED', 'COMPLETED'].includes(item.status)).length,
      needsCare: items.filter((item: DossierItem) => item.status === 'NEED_CHANGES').length,
    };
  }, [data]);

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 280,
      render: (code: string, record: DossierItem) => (
        <Link href={`/main/dossiers/${record.id}`}>
          <Space className="cursor-pointer whitespace-nowrap">
            <FileExcelOutlined className="text-(--color-primary-700)" />
            <span className="font-bold text-slate-900 hover:text-emerald-700 transition-colors">
              {code}
            </span>
          </Space>
        </Link>
      ),
    },
    {
      title: 'Sales phụ trách',
      key: 'sales',
      width: 188,
      render: (_: unknown, record: DossierItem) => (
        <Space size={8}>
          <Avatar size={28}>{record.salesUser?.fullName?.charAt(0)}</Avatar>
          <Text className="max-w-31 truncate">{record.salesUser?.fullName || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 220,
      render: (_: unknown, record: DossierItem) => (
        <div className="flex flex-col">
          <Text strong>{record.customerName || record.customer?.displayName || '-'}</Text>
          <Text type="secondary" className="text-xs">
            {record.customer?.code || record.customerId || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tuyến/Chương trình',
      key: 'route',
      render: (_: unknown, record: DossierItem) => (
        <div className="flex flex-col">
          <Text>{record.route || record.name}</Text>
          <Text type="secondary" className="text-xs">
            {record.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Ngày đi',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 125,
      render: compactDate,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: string) => {
        const config = getStatus(value);
        return <Tag className={config.className}>{config.label}</Tag>;
      },
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (value?: string) => {
        const map: Record<string, { label: string; className: string }> = {
          HIGH: { label: 'Cao', className: 'skylux-status-danger' },
          MEDIUM: { label: 'Trung bình', className: 'skylux-status-warning' },
          LOW: { label: 'Thấp', className: 'skylux-status-valid' },
        };
        const config = map[value || ''] || { label: value || '-', className: 'skylux-status-info' };
        return <Tag className={config.className}>{config.label}</Tag>;
      },
    },
    {
      title: 'Điều hành phụ trách',
      key: 'operator',
      width: 180,
      render: (_: unknown, record: DossierItem) => record.operatorUser?.fullName || '-',
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 155,
      render: formatDate,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: DossierItem) => (
        <Link href={`/main/dossiers/${record.id}`}>
          <Button icon={<EyeOutlined />} className="skylux-outline-button">
            Xem chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  const visibleColumns = isOperator
    ? columns.filter((column) => !['priority', 'operator'].includes(column.key as string))
    : columns;

  return (
    <div className={`space-y-5 ${isOperator ? 'op-page op-dossiers-page' : ''}`} suppressHydrationWarning>
      <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${isOperator ? 'op-page-heading' : ''}`} suppressHydrationWarning>
        <div>
          <Title level={1} className="skylux-page-title" suppressHydrationWarning>
            {isCeoAdmin ? 'Hồ sơ toàn hệ thống' : isOperator ? 'Hồ sơ chờ xử lý' : 'Hồ sơ của tôi'}
          </Title>
          <div className="skylux-subtitle mt-1" suppressHydrationWarning>
            {isCeoAdmin ? 'Theo dõi toàn bộ hồ sơ và tiến độ xử lý trong công ty' : isOperator ? 'Danh sách hồ sơ và dự toán cần kiểm tra điều hành' : 'Danh sách hồ sơ và dự toán của bạn'}
          </div>
        </div>
        <Link href="/main/imports">
          <Button icon={<FileExcelOutlined />} className="skylux-primary-button" suppressHydrationWarning>
            {isCeoAdmin || isOperator ? 'Kiểm tra dữ liệu Excel' : 'Import dự toán Excel'}
          </Button>
        </Link>
      </div>

      <Card className={isOperator ? 'op-card op-filter-card' : 'skylux-card'} suppressHydrationWarning>
        <div className={`grid grid-cols-1 gap-4 ${isOperator ? 'xl:grid-cols-[minmax(280px,1.65fr)_180px_180px_auto]' : 'md:grid-cols-[minmax(260px,1.4fr)_180px_180px_auto]'}`} suppressHydrationWarning>
          <Input
            placeholder="Tìm kiếm hồ sơ, khách hàng, chương trình..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            allowClear
          />
          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={(value) => {
              setStatus(value || undefined);
              setPage(1);
            }}
            options={statusOptions}
          />
          <Select
            placeholder="Độ ưu tiên"
            value={priority}
            onChange={(value) => {
              setPriority(value || undefined);
              setPage(1);
            }}
            options={priorityOptions}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearch('');
              setStatus(undefined);
              setPriority(undefined);
              setPage(1);
              router.push('/main/dossiers');
              refetch();
            }}
          >
            Đặt lại
          </Button>
        </div>
      </Card>

      <Row gutter={[16, 16]} className={isOperator ? 'op-kpi-row' : undefined}>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-(--color-primary-soft) text-(--color-primary-600)">
                <FolderOpenOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Tổng hồ sơ</Text>
                <div className="mt-1 text-[30px] font-bold text-(--color-primary-900)">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-(--color-gold-soft) text-(--color-gold)">
                <ClockCircleOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Chờ xử lý</Text>
                <div className="mt-1 text-[30px] font-bold text-(--color-primary-900)">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.waiting}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-(--color-warning-soft) text-(--color-warning)">
                <WarningOutlined />
              </span>
              <div>
              <Text className="text-sm text-slate-500">Cần bổ sung</Text>
                <div className="mt-1 text-[30px] font-bold text-(--color-primary-900)">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.needsCare}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-(--color-primary-soft) text-(--color-primary-600)">
                <CheckCircleOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Đã duyệt</Text>
                <div className="mt-1 text-[30px] font-bold text-(--color-primary-900)">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.approved}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {salesUserId && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircleOutlined className="text-emerald-600 text-base" />
            <span>
              Đang hiển thị hồ sơ của nhân sự Sales:{' '}
              <strong className="text-emerald-800 underline">
                {(data?.data?.[0] || (data as any)?.items?.[0])?.salesUser?.fullName || 'Nhân sự đã chọn'}
              </strong>
            </span>
          </div>
          <Button
            size="small"
            type="primary"
            ghost
            danger
            onClick={() => {
              setPage(1);
              router.push('/main/dossiers');
            }}
          >
            Xóa bộ lọc Sales ✕
          </Button>
        </div>
      )}

      <Card className={isOperator ? 'op-card op-dossier-table' : 'skylux-card'}>
        <Table
          dataSource={data?.data || (data as any)?.items || []}
          columns={visibleColumns}
          rowKey="id"
          loading={isLoading}
          className={isOperator ? 'op-table' : 'skylux-table'}
          locale={{ emptyText: <Empty description="Chưa có hồ sơ nào trong hệ thống" /> }}
          scroll={{ x: 1380 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.meta?.total ?? (data as any)?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Hiển thị ${data?.data?.length || (data as any)?.items?.length || 0} trong tổng số ${total} hồ sơ`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>
    </div>
  );
}

export default function DossiersPage() {
  return (
    <React.Suspense fallback={<div className="p-6"><Skeleton active /></div>}>
      <DossiersContent />
    </React.Suspense>
  );
}
