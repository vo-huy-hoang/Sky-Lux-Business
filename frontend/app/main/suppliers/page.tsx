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
  Tooltip,
  Segmented,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers.service';
import { SupplierItem, SupplierStatus } from '@/types/supplier';
import { SupplierFormModal } from './components/SupplierFormModal';
import { SupplierDetailDrawer } from './components/SupplierDetailDrawer';
import dayjs from 'dayjs';
import { useAuthStore } from '@/lib/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { useRouter } from 'next/navigation';


const { Title, Text } = Typography;
const { Option } = Select;

export default function SuppliersPage() {
  const router = useRouter();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isCeoAdmin = hasRole('CEO_ADMIN') || hasRole('SUPER_ADMIN');

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SupplierStatus | undefined>();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(
    null,
  );

  const { data, isLoading, refetch } = useQuery({

    queryKey: queryKeys.suppliers.list({
      page,
      limit: pageSize,
      search: search || undefined,
      status,
    }),
    queryFn: () =>
      suppliersService.getSuppliers({
        page,
        limit: pageSize,
        search: search || undefined,
        status,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersService.deleteSupplier(id),
    onSuccess: () => {
      message.success('Đã xóa nhà cung cấp');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể xóa nhà cung cấp';

      message.error(msg);
    },
  });

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormModalVisible(true);
  };

  const handleOpenEdit = (record: SupplierItem) => {
    setEditingSupplier(record);
    setFormModalVisible(true);
  };

  const handleViewDetail = (id: string) => {
    setSelectedSupplierId(id);
    setDetailDrawerVisible(true);
  };

  const getStatusTag = (supplierStatus: SupplierStatus) => {
    switch (supplierStatus) {
      case 'ACTIVE':
        return <Tag color="success">Hoạt động</Tag>;
      case 'INACTIVE':
        return <Tag color="default">Ngừng hoạt động</Tag>;
      case 'LOCKED':
        return <Tag color="error">Đang khóa</Tag>;
      default:
        return <Tag>{supplierStatus}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã NCC',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tên nhà cung cấp',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SupplierItem) => (
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
      title: 'Loại NCC',
      dataIndex: 'supplierType',
      key: 'supplierType',
      width: 150,
      render: (supplierType: SupplierItem['supplierType']) =>
        supplierType ? (
          <Tag color="purple">{supplierType.name}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Người liên hệ',
      key: 'contact',
      width: 200,
      render: (_: any, record: SupplierItem) => (
        <Space direction="vertical" size={0}>
          {record.contactName ? (
            <Text>{record.contactName}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
          {record.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.phone}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      width: 140,
      render: (taxCode?: string) =>
        taxCode ? <Text copyable>{taxCode}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (supplierStatus: SupplierStatus) => getStatusTag(supplierStatus),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) =>
        date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: SupplierItem) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xác nhận xóa nhà cung cấp"
              description={`Bạn có chắc chắn muốn xóa nhà cung cấp "${record.name}"?`}
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={isCeoAdmin ? 'space-y-5' : ''} style={isCeoAdmin ? undefined : { padding: '24px' }}>
      {isCeoAdmin && (
        <Segmented
          block
          value="suppliers"
          onChange={(value) => value === 'customers' && router.push('/main/customers')}
          options={[{ label: 'Khách hàng', value: 'customers' }, { label: 'Nhà cung cấp', value: 'suppliers' }]}
          className="max-w-[420px]"
        />
      )}
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ShopOutlined style={{ marginRight: 8 }} />
            Quản lý nhà cung cấp (NCC)
          </Title>
          <Text type="secondary">
            Quản lý danh sách đối tác cung cấp dịch vụ (Khách sạn, Vận chuyển, Nhà hàng, Hàng không...)
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenCreate}
        >
          Thêm nhà cung cấp
        </Button>
      </div>

      {/* Filter Card */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap style={{ width: '100%' }}>
          <Input
            placeholder="Tìm kiếm theo mã, tên, SĐT, MST..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 300 }}
            allowClear
          />

          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            style={{ width: 180 }}
            allowClear
          >
            <Option value="ACTIVE">Hoạt động (ACTIVE)</Option>
            <Option value="INACTIVE">Ngừng hoạt động (INACTIVE)</Option>
            <Option value="LOCKED">Đang khóa (LOCKED)</Option>
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            Làm mới
          </Button>
        </Space>
      </Card>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} nhà cung cấp`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Form Modal (Create / Edit) */}
      <SupplierFormModal
        visible={formModalVisible}
        onCancel={() => {
          setFormModalVisible(false);
          setEditingSupplier(null);
        }}
        initialData={editingSupplier}
      />

      {/* Detail Drawer */}
      <SupplierDetailDrawer
        visible={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedSupplierId(null);
        }}
        supplierId={selectedSupplierId}
        onEdit={(supplier) => {
          setDetailDrawerVisible(false);
          handleOpenEdit(supplier);
        }}
      />
    </div>
  );
}
