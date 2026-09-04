'use client';

import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExportOutlined,
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
import DossierDetailView from '@/components/dossiers/DossierDetailView';
import { DossierComments } from './components/DossierComments';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useDebounce } from '@/hooks/use-debounce';

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

function DossiersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesUserId = searchParams.get('salesUserId') || undefined;
  const statusParam = searchParams.get('status') || undefined;

  const hasRole = useAuthStore((state) => state.hasRole);
  const isCeoAdmin = hasRole(['CEO_ADMIN', 'SUPER_ADMIN']);
  const isOperator = hasRole('OPERATOR');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState<string | undefined>(statusParam);
  const [priority, setPriority] = useState<string>();
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useDossiersList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    salesUserId: salesUserId || undefined,
  });

  const summary = useMemo(() => {
    const items = data?.items || [];
    return {
      total: data?.total || 0,
      waiting: items.filter((item: DossierItem) => ['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(item.status)).length,
      approved: items.filter((item: DossierItem) => ['APPROVED', 'COMPLETED'].includes(item.status)).length,
      needsCare: items.filter((item: DossierItem) => item.status === 'NEED_CHANGES').length,
    };
  }, [data]);

  const selectedDossier = useMemo(
    () => data?.items?.find((item: DossierItem) => item.id === selectedDossierId),
    [data?.items, selectedDossierId],
  );

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => (
        <Space>
          <FileExcelOutlined className="text-(--color-primary-700)" />
          <Text strong>{code}</Text>
        </Space>
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
          <Text strong>{record.customer?.displayName || '-'}</Text>
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
        <Button
          icon={<EyeOutlined />}
          className="skylux-outline-button"
          onClick={() => setSelectedDossierId(record.id)}
        >
          Xem chi tiết
        </Button>
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
                {data?.items?.[0]?.salesUser?.fullName || 'Nhân sự đã chọn'}
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

      <Drawer
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <Space>
              <FolderOpenOutlined className="text-[#004230]" />
              <span className="font-bold text-slate-800">Chi tiết hồ sơ tour</span>
            </Space>
            {selectedDossierId && (isOperator || isCeoAdmin) && (
              <Link href={`/main/dossiers/${selectedDossierId}`} target="_blank">
                <Button type="link" size="small" icon={<ExportOutlined />}>
                  Mở toàn trang ↗
                </Button>
              </Link>
            )}
          </div>
        }
        styles={{ wrapper: { width: isOperator || isCeoAdmin ? 1000 : 720, maxWidth: '100vw' } }}
        open={!!selectedDossierId}
        onClose={() => setSelectedDossierId(null)}
        destroyOnClose
      >
        {selectedDossierId && (
          isOperator || isCeoAdmin ? (
            <DossierDetailView
              dossierId={selectedDossierId}
              isDrawer={true}
              onClose={() => {
                setSelectedDossierId(null);
                refetch();
              }}
            />
          ) : selectedDossier ? (
            <div className="space-y-4">
              <Card className="skylux-card">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {selectedDossier.name}
                    </Title>
                    <Text type="secondary">{selectedDossier.route || '-'}</Text>
                  </div>
                  <Tag className={getStatus(selectedDossier.status).className}>
                    {getStatus(selectedDossier.status).label}
                  </Tag>
                </div>
              </Card>

              <Tabs
                defaultActiveKey="info"
                items={[
                  {
                    key: 'info',
                    label: 'Thông tin chung',
                    children: (
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Mã hồ sơ">
                          {selectedDossier.code}
                        </Descriptions.Item>
                        <Descriptions.Item label="Khách hàng">
                          {selectedDossier.customer?.displayName ||
                            selectedDossier.customer?.code ||
                            selectedDossier.customerId ||
                            '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày bắt đầu">
                          {compactDate(selectedDossier.startDate)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày kết thúc">
                          {compactDate(selectedDossier.endDate)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Sales phụ trách">
                          {selectedDossier.salesUser?.fullName || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Điều hành phụ trách">
                          {selectedDossier.operatorUser?.fullName || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Độ ưu tiên">
                          {selectedDossier.priority || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Cập nhật cuối">
                          {formatDate(selectedDossier.updatedAt)}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  {
                    key: 'comments',
                    label: 'Trao đổi',
                    children: (
                      <DossierComments
                        dossierId={selectedDossier.id}
                        isLocked={selectedDossier.status === 'LOCKED'}
                      />
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <Empty description="Chưa có dữ liệu chi tiết hồ sơ" />
          )
        )}
      </Drawer>
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
