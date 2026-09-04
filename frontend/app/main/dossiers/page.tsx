'use client';

import React, { useMemo, useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { DossierItem } from '@/types/dossier';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Title, Text } = Typography;

const statusOptions = [
  { label: 'Tất cả', value: '' },
  { label: 'Mới nhập', value: 'DRAFT' },
  { label: 'Đã gửi', value: 'SUBMITTED' },
  { label: 'Đang xử lý', value: 'IN_REVIEW' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Thành công', value: 'COMPLETED' },
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
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning' },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid' },
  COMPLETED: { label: 'Thành công', className: 'skylux-status-valid' },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger' },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple' },
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

export default function DossiersPage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  const isCeoAdmin = hasRole('CEO_ADMIN') || hasRole('SUPER_ADMIN');
  const isOperator = hasRole('OPERATOR');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [priority, setPriority] = useState<string>();

  const { data, isLoading, refetch } = useQuery({

    queryKey: queryKeys.dossiers.list({
      page,
      limit: pageSize,
      search: search || undefined,
      status: status || undefined,
      priority: priority || undefined,
    }),
    queryFn: () =>
      dossiersService.getDossiers({
        page,
        limit: pageSize,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
      }),
  });

  const summary = useMemo(() => {
    const items = data?.items || [];
    return {
      total: data?.total || 0,
      waiting: items.filter((item) => ['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(item.status)).length,
      approved: items.filter((item) => ['APPROVED', 'COMPLETED'].includes(item.status)).length,
      needsCare: items.filter((item) => item.status === 'NEED_CHANGES').length,
    };
  }, [data]);

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: DossierItem) => (
        <Link href={`/main/dossiers/${record.id}`}>
          <Space className="cursor-pointer">
            <FileExcelOutlined className="text-[var(--color-primary-700)]" />
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
          <Text className="max-w-[124px] truncate">{record.salesUser?.fullName || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 220,
      render: (_: unknown, record: DossierItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.customer?.displayName || '-'}</Text>
          <Text type="secondary" className="text-xs">
            {record.customer?.code || record.customerId || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Tuyến/Chương trình',
      key: 'route',
      render: (_: unknown, record: DossierItem) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.route || record.name}</Text>
          <Text type="secondary" className="text-xs">
            {record.name}
          </Text>
        </Space>
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
      width: 170,
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
    <div className={`space-y-5 ${isOperator ? 'op-page op-dossiers-page' : ''}`}>
      <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${isOperator ? 'op-page-heading' : ''}`}>
        <div>
          <Title level={1} className="skylux-page-title">
            {isCeoAdmin ? 'Hồ sơ toàn hệ thống' : isOperator ? 'Hồ sơ chờ xử lý' : 'Hồ sơ của tôi'}
          </Title>
          <div className="skylux-subtitle mt-1">{isCeoAdmin ? 'Theo dõi toàn bộ hồ sơ và tiến độ xử lý trong công ty' : isOperator ? 'Danh sách hồ sơ và dự toán cần kiểm tra điều hành' : 'Danh sách hồ sơ và dự toán của bạn'}</div>
        </div>
        <Link href="/main/imports">
          <Button icon={<FileExcelOutlined />} className="skylux-primary-button">
            {isCeoAdmin || isOperator ? 'Kiểm tra dữ liệu Excel' : 'Import dự toán Excel'}
          </Button>
        </Link>
      </div>

      <Card className={isOperator ? 'op-card op-filter-card' : 'skylux-card'}>
        <div className={`grid grid-cols-1 gap-4 ${isOperator ? 'xl:grid-cols-[minmax(280px,1.65fr)_180px_180px_auto]' : 'md:grid-cols-[minmax(260px,1.4fr)_180px_180px_auto]'}`}>
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
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Đặt lại
          </Button>
        </div>
      </Card>

      <Row gutter={[16, 16]} className={isOperator ? 'op-kpi-row' : undefined}>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <FolderOpenOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Tổng hồ sơ</Text>
                <div className="mt-1 text-[30px] font-bold text-[var(--color-primary-900)]">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.total}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]">
                <ClockCircleOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Chờ xử lý</Text>
                <div className="mt-1 text-[30px] font-bold text-[var(--color-primary-900)]">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.waiting}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-warning-soft)] text-[var(--color-warning)]">
                <WarningOutlined />
              </span>
              <div>
              <Text className="text-sm text-slate-500">Cần bổ sung</Text>
                <div className="mt-1 text-[30px] font-bold text-[var(--color-primary-900)]">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.needsCare}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className={isOperator ? 'op-card op-kpi-card' : 'skylux-card skylux-kpi'}>
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <CheckCircleOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Đã duyệt</Text>
                <div className="mt-1 text-[30px] font-bold text-[var(--color-primary-900)]">
                  {isLoading ? <Skeleton.Input active size="small" /> : summary.approved}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className={isOperator ? 'op-card op-dossier-table' : 'skylux-card'}>
        <Table
          dataSource={data?.items || []}
          columns={visibleColumns}
          rowKey="id"
          loading={isLoading}
          className={isOperator ? 'op-table' : 'skylux-table'}
          locale={{ emptyText: <Empty description="Chưa có hồ sơ từ API" /> }}
          scroll={{ x: 1220 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Hiển thị ${data?.items?.length || 0} trong tổng số ${total} hồ sơ`,
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
