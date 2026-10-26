'use client';

import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowUpOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { CustomerItem, CustomerType } from '@/types/customer';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { SupplierManagementContent } from '../suppliers/components/SupplierManagementContent';

const { Title, Text } = Typography;

function initials(name?: string) {
  if (!name) return 'KH';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDateOnly(dateStr?: string) {
  if (!dateStr) return '-';
  const match = dateStr.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateStr;
}

export default function CustomersPage() {
  const router = useRouter();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isCeoAdmin = hasRole(['CEO_ADMIN', 'SUPER_ADMIN']);
  const isOperator = hasRole('OPERATOR');
  const isSales = hasRole('SALES');
  const canDeleteCustomer = !isSales && (isCeoAdmin || isOperator);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [customerType, setCustomerType] = useState<CustomerType | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [activeDirectoryTab, setActiveDirectoryTab] = useState<'customers' | 'suppliers'>('customers');

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.customers.list({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      customerType,
      status,
    }),
    queryFn: ({ signal }) =>
      customersService.getCustomers(
        {
          page,
          limit: pageSize,
          search: debouncedSearch || undefined,
          customerType,
          status,
        },
        { signal },
      ),
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: queryKeys.customers.summary(),
    queryFn: ({ signal }) =>
      customersService.getCustomers({ page: 1, limit: 100 }, { signal }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onSuccess: () => {
      message.success('Đã xóa khách hàng');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể xóa khách hàng');
    },
  });


  const handleViewDetail = (id: string) => {
    router.push(`/customers/${id}`);
  };

  const summary = useMemo(() => {
    const items = summaryData?.data || [];
    return {
      total: summaryData?.meta?.total || 0,
      active: items.filter((item) => item.status === 'ACTIVE').length,
      business: items.filter((item) => item.customerType === 'BUSINESS').length,
      individual: items.filter((item) => item.customerType === 'INDIVIDUAL').length,
    };
  }, [summaryData]);

  const columns = [
    {
      title: 'Mã KH',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: CustomerItem) => (
        <span
          onClick={() => handleViewDetail(record.id)}
          className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors"
        >
          {code}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: CustomerItem) => (
        <div
          onClick={() => handleViewDetail(record.id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Avatar
            size={34}
            style={{
              background: record.customerType === 'BUSINESS' ? '#EEF5FF' : '#EAF5EF',
              color: record.customerType === 'BUSINESS' ? '#2F80ED' : '#007A55',
              fontWeight: 700,
            }}
            icon={record.customerType === 'BUSINESS' ? <TeamOutlined /> : undefined}
          >
            {record.customerType === 'BUSINESS' ? undefined : initials(text)}
          </Avatar>
          <Space orientation="vertical" size={0}>
            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {text}
            </span>
            <Text type="secondary" className="text-xs">
              {record.email || record.address || '-'}
            </Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'customerType',
      key: 'customerType',
      width: 135,
      render: (type: CustomerType) => (
        <Tag className={type === 'BUSINESS' ? 'skylux-status-info' : 'skylux-status-valid'}>
          {type === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân'}
        </Tag>
      ),
    },
    {
      title: 'Người liên hệ chính',
      key: 'primaryContact',
      render: (_: unknown, record: CustomerItem) => {
        const primary = record.contacts?.find((contact) => contact.isPrimary) || record.contacts?.[0];
        if (!primary) return <Text type="secondary">-</Text>;
        return (
          <div className="flex flex-col">
            <Space size={6}>
              <Text>{primary.name}</Text>
              {primary.isPrimary && <StarFilled style={{ color: '#D6A51F', fontSize: 12 }} />}
            </Space>
            <Text type="secondary" className="text-xs">
              {primary.position || primary.phone || '-'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone?: string) => phone || '-',
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 120,
      render: (dateOfBirth?: string) => (
        <span className="inline-flex items-center gap-1.5">
          <CalendarOutlined className="text-slate-400" />
          {formatDateOnly(dateOfBirth)}
        </span>
      ),
    },
    {
      title: 'Hồ sơ',
      key: 'dossiers',
      width: 95,
      render: (_: unknown, record: CustomerItem) => (
        <Tag className="skylux-status-valid">{record.dossierCount || 0}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 135,
      render: (value: string) => (
        <Tag className={value === 'ACTIVE' ? 'skylux-status-valid' : 'skylux-status-info'}>
          {value === 'ACTIVE' ? 'Đang chăm sóc' : value}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 135,
      render: (_: unknown, record: CustomerItem) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            size="small"
            aria-label="Xem chi tiết khách hàng"
            onClick={() => handleViewDetail(record.id)}
          />
          {canDeleteCustomer && (
            <Popconfirm
              title="Xóa khách hàng"
              description="Bạn có chắc chắn muốn xóa khách hàng này?"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                aria-label="Xóa khách hàng"
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          )}
          <Button icon={<MoreOutlined />} size="small" aria-label="Mở thêm thao tác" />
        </Space>
      ),
    },
  ];

  const metricCards = [
    {
      label: 'Tổng khách hàng',
      value: summary.total,
      icon: <TeamOutlined />,
      bubble: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]',
      hint: 'Khách hàng toàn hệ thống',
    },
    {
      label: 'Đang chăm sóc',
      value: summary.active,
      icon: <UserOutlined />,
      bubble: 'bg-[var(--color-gold-soft)] text-[var(--color-gold)]',
      hint: 'Trạng thái active',
    },
    {
      label: 'Doanh nghiệp',
      value: summary.business,
      icon: <TeamOutlined />,
      bubble: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
      hint: 'Theo trang dữ liệu tải',
    },
    {
      label: 'Cá nhân',
      value: summary.individual,
      icon: <FolderOpenOutlined />,
      bubble: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]',
      hint: 'Theo trang dữ liệu tải',
    },
  ];

  return (
    <div className="space-y-5">
      {isCeoAdmin && (
        <Segmented
          block
          value={activeDirectoryTab}
          onChange={(value) => setActiveDirectoryTab(value as 'customers' | 'suppliers')}
          options={[{ label: 'Khách hàng', value: 'customers' }, { label: 'Nhà cung cấp', value: 'suppliers' }]}
          className="max-w-[420px]"
        />
      )}
      <div>
        <Title level={1} className="skylux-page-title">
          {isCeoAdmin ? 'Khách hàng & nhà cung cấp' : 'Khách hàng của tôi'}
        </Title>
        <div className="skylux-subtitle mt-1">
          {isCeoAdmin ? 'Quản lý dữ liệu khách hàng và đối tác trên toàn công ty' : 'Danh sách khách hàng cá nhân và doanh nghiệp bạn đang quản lý'}
        </div>
      </div>

      {activeDirectoryTab === 'suppliers' && isCeoAdmin ? (
        <SupplierManagementContent />
      ) : (
        <>
      <Row gutter={[16, 16]}>
        {metricCards.map((metric) => (
          <Col xs={24} sm={12} xl={6} key={metric.label}>
            <Card className="skylux-card skylux-kpi">
              <div className="flex items-center gap-5">
                <span className={`skylux-icon-bubble ${metric.bubble}`}>{metric.icon}</span>
                <div>
                  <Text className="text-sm text-slate-500">{metric.label}</Text>
                  <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                    {isLoadingSummary ? <Skeleton.Input active size="small" /> : metric.value}
                  </div>
                  <div className="mt-3 text-xs font-medium text-[var(--color-primary-600)]">
                    <ArrowUpOutlined /> {metric.hint}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="skylux-card">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_220px_auto_auto]">
          <Input
            placeholder="Tìm kiếm theo mã, tên, SĐT, email..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            allowClear
          />
          <Select
            placeholder="Loại khách hàng"
            value={customerType}
            onChange={(value) => {
              setCustomerType(value);
              setPage(1);
            }}
            allowClear
            options={[
              { label: 'Cá nhân', value: 'INDIVIDUAL' },
              { label: 'Doanh nghiệp', value: 'BUSINESS' },
            ]}
          />
          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            allowClear
            options={[
              { label: 'Hoạt động', value: 'ACTIVE' },
              { label: 'Ngừng hoạt động', value: 'INACTIVE' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Đặt lại
          </Button>
          <Button icon={<PlusOutlined />} className="skylux-primary-button">
            Thêm khách hàng
          </Button>
        </div>
      </Card>

      <Card className="skylux-card">
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          className="skylux-table"
          locale={{ emptyText: <Empty description="Chưa có khách hàng nào trong hệ thống" /> }}
          scroll={{ x: 1240 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Hiển thị ${data?.data?.length || 0} trong tổng số ${total} khách hàng`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>
        </>
      )}
    </div>
  );
}
