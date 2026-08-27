'use client';

import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Card,
  Popconfirm,
  message,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  TeamOutlined,
  ReloadOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { CustomerItem, CustomerType } from '@/types/customer';
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';

const { Title, Text } = Typography;
const { Option } = Select;

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', page, pageSize, search, customerType, status],
    queryFn: () =>
      customersService.getCustomers({
        page,
        limit: pageSize,
        search: search || undefined,
        customerType,
        status,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onSuccess: () => {
      message.success('Đã xóa khách hàng');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể xóa khách hàng');
    },
  });

  const handleViewDetail = (id: string) => {
    setSelectedCustomerId(id);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: 'Mã khách hàng',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tên khách hàng',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: CustomerItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.address && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.address}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'customerType',
      key: 'customerType',
      width: 120,
      render: (type: CustomerType) => (
        <Tag color={type === 'BUSINESS' ? 'geekblue' : 'purple'}>
          {type === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân'}
        </Tag>
      ),
    },
    {
      title: 'Liên hệ chính',
      key: 'primaryContact',
      render: (_: any, record: CustomerItem) => {
        const primary =
          record.contacts?.find((c) => c.isPrimary) || record.contacts?.[0];
        if (!primary) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <span>{primary.name}</span>
              {primary.isPrimary && (
                <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
              )}
            </Space>
            {primary.phone && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {primary.phone}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (st: string) => (
        <Tag color={st === 'ACTIVE' ? 'success' : 'default'}>{st}</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: any, record: CustomerItem) => (
        <Space size="small">
          <Button
            type="primary"
            ghost
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetail(record.id)}
          >
            Chi tiết
          </Button>
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
              loading={deleteMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined /> Quản lý Khách hàng (CRM)
          </Title>
        </div>

        {/* Thanh tìm kiếm và bộ lọc */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Tìm kiếm theo mã, tên, SĐT, email..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 280 }}
            allowClear
          />

          <Select
            placeholder="Loại khách hàng"
            value={customerType}
            onChange={(val) => {
              setCustomerType(val);
              setPage(1);
            }}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="INDIVIDUAL">Cá nhân</Option>
            <Option value="BUSINESS">Doanh nghiệp</Option>
          </Select>

          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="ACTIVE">Hoạt động</Option>
            <Option value="INACTIVE">Ngừng hoạt động</Option>
          </Select>

          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Làm mới
          </Button>
        </Space>

        {/* Bảng danh sách khách hàng */}
        <Table
          dataSource={data?.items || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Side Drawer xem chi tiết, quản lý liên hệ và hồ sơ liên quan */}
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
