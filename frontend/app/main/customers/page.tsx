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
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';

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

export default function CustomersPage() {
  const router = useRouter();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isCeoAdmin = hasRole('CEO_ADMIN') || hasRole('SUPER_ADMIN');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.customers.list({
      page,
      limit: pageSize,
      search: search || undefined,
      customerType,
      status,
    }),
    queryFn: () =>
      customersService.getCustomers({
        page,
        limit: pageSize,
        search: search || undefined,
        customerType,
        status,
      }),
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: queryKeys.customers.summary(),
    queryFn: () => customersService.getCustomers({ page: 1, limit: 100 }),
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
    setSelectedCustomerId(id);
    setDrawerVisible(true);
  };

  const summary = useMemo(() => {
    const items = summaryData?.items || [];
    return {
      total: summaryData?.total || 0,
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
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: CustomerItem) => (
        <Space size={12}>
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
          <Space direction="vertical" size={0}>
            <Text strong>{text}</Text>
            <Text type="secondary" className="text-xs">
              {record.email || record.address || '-'}
            </Text>
          </Space>
        </Space>
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
          <Space direction="vertical" size={0}>
            <Space size={6}>
              <Text>{primary.name}</Text>
              {primary.isPrimary && <StarFilled style={{ color: '#D6A51F', fontSize: 12 }} />}
            </Space>
            <Text type="secondary" className="text-xs">
              {primary.position || primary.phone || '-'}
            </Text>
          </Space>
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
      title: 'Hồ sơ',
      key: 'contacts',
      width: 95,
      render: (_: unknown, record: CustomerItem) => (
        <Tag className="skylux-status-valid">{record.contacts?.length || 0}</Tag>
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
      hint: 'Từ API khách hàng',
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
          value="customers"
          onChange={(value) => value === 'suppliers' && router.push('/main/suppliers')}
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
          dataSource={data?.items || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          className="skylux-table"
          locale={{ emptyText: <Empty description="Chưa có khách hàng từ API" /> }}
          scroll={{ x: 1120 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Hiển thị ${data?.items?.length || 0} trong tổng số ${total} khách hàng`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <CustomerDetailDrawer
        visible={drawerVisible}
        customerId={selectedCustomerId}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedCustomerId(null);
        }}
      />
    </div>
  );
}
