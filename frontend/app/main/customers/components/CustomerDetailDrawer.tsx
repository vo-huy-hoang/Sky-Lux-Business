'use client';

import React, { useState } from 'react';
import {
  Drawer,
  Tabs,
  Descriptions,
  Table,
  Button,
  Tag,
  Space,
  Popconfirm,
  message,
  Typography,
  Card,
  Empty,
} from 'antd';
import {
  UserOutlined,
  ContactsOutlined,
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarFilled,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { CustomerItem, CustomerContact } from '@/types/customer';
import { DossierItem } from '@/types/dossier';
import { ContactModal } from './ContactModal';
import { queryKeys } from '@/lib/query-keys';

const { Text } = Typography;

interface CustomerDetailDrawerProps {
  visible: boolean;
  customerId: string | null;
  onClose: () => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  visible,
  customerId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(
    null,
  );
  const [dossierPage, setDossierPage] = useState(1);

  // 1. Fetch chi tiết khách hàng (API-CUSTOMER-002)

  const { data: customer, isLoading: isLoadingCustomer } = useQuery<CustomerItem>({
    queryKey: queryKeys.customers.detail(customerId || undefined),
    queryFn: ({ signal }) => customersService.getCustomer(customerId!, { signal }),
    enabled: !!customerId && visible,
  });

  // 2. Fetch danh sách hồ sơ liên quan (API-CONTACT-005)
  const { data: dossiersData, isLoading: isLoadingDossiers } = useQuery<{
    data: DossierItem[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>({
    queryKey: queryKeys.dossiers.list({ customerId: customerId || undefined, page: dossierPage, limit: 10 }),
    queryFn: ({ signal }) =>
      customersService.getCustomerDossiers(
        customerId!,
        {
          page: dossierPage,
          limit: 10,
        },
        { signal },
      ),
    enabled: !!customerId && visible,
  });

  // 3. Mutation xóa liên hệ (API-CONTACT-004)
  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) =>
      customersService.deleteContact(customerId!, contactId),
    onSuccess: () => {
      message.success('Đã xóa người liên hệ');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId || undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (err: any) => {
      message.error(
        err?.response?.data?.message || 'Không thể xóa người liên hệ',
      );
    },
  });


  const handleOpenCreateContact = () => {
    setSelectedContact(null);
    setContactModalVisible(true);
  };

  const handleOpenEditContact = (contact: CustomerContact) => {
    setSelectedContact(contact);
    setContactModalVisible(true);
  };

  const contactColumns = [
    {
      title: 'Họ và tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CustomerContact) => (
        <div className="flex flex-col gap-0.5">
          <Space>
            <Text strong>{name}</Text>
            {record.isPrimary && (
              <Tag color="gold" icon={<StarFilled />}>
                Chính
              </Tag>
            )}
          </Space>
          {record.position && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.position}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contactInfo',
      render: (_: any, record: CustomerContact) => (
        <div className="flex flex-col gap-0.5">
          {record.phone && (
            <Text>
              <PhoneOutlined /> {record.phone}
            </Text>
          )}
          {record.email && (
            <Text type="secondary">
              <MailOutlined /> {record.email}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      render: (_: any, record: CustomerContact) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenEditContact(record)}
          />
          <Popconfirm
            title="Xóa người liên hệ"
            description="Bạn có chắc chắn muốn xóa người liên hệ này?"
            onConfirm={() => deleteContactMutation.mutate(record.id!)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              loading={deleteContactMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dossierColumns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tên tour / Tuyến đường',
      key: 'name',
      render: (_: any, record: DossierItem) => (
        <div>
          <div>{record.name}</div>
          {record.route && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.route}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          DRAFT: 'default',
          SUBMITTED: 'processing',
          IN_REVIEW: 'warning',
          APPROVED: 'success',
          COMPLETED: 'blue',
          LOCKED: 'error',
          CANCELLED: 'default',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Sales phụ trách',
      key: 'sales',
      render: (_: any, record: DossierItem) => (
        <span>{record.salesUser?.fullName || '-'}</span>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString('vi-VN') : '-',
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <UserOutlined />
          <span>{customer?.displayName || 'Chi tiết khách hàng'}</span>
          {customer?.code && <Tag color="blue">{customer.code}</Tag>}
        </Space>
      }
      placement="right"
      styles={{ wrapper: { width: 720, maxWidth: '100vw' } }}
      open={visible}
      onClose={onClose}
      loading={isLoadingCustomer}
    >
      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: (
              <span>
                <UserOutlined /> Thông tin chung
              </span>
            ),
            children: customer ? (
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Mã khách hàng">
                  <Text strong>{customer.code}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Loại khách hàng">
                  <Tag
                    color={
                      customer.customerType === 'BUSINESS' ? 'geekblue' : 'purple'
                    }
                  >
                    {customer.customerType === 'BUSINESS'
                      ? 'Doanh nghiệp'
                      : 'Cá nhân'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tên khách hàng" span={2}>
                  {customer.displayName}
                </Descriptions.Item>
                <Descriptions.Item label="Mã số thuế">
                  {customer.taxCode || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={customer.status === 'ACTIVE' ? 'success' : 'default'}
                  >
                    {customer.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {customer.phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {customer.email || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày sinh nhật">
                  {customer.dateOfBirth
                    ? new Date(customer.dateOfBirth).toLocaleDateString('vi-VN')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {customer.address || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sales phụ trách" span={2}>
                  {customer.assignedSales?.fullName ? (
                    <Space>
                      <UserOutlined />
                      <span>{customer.assignedSales.fullName}</span>
                      <Text type="secondary">
                        ({customer.assignedSales.email})
                      </Text>
                    </Space>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {new Date(customer.createdAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật lần cuối">
                  {new Date(customer.updatedAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Không có thông tin" />
            ),
          },
          {
            key: 'contacts',
            label: (
              <span>
                <ContactsOutlined /> Người liên hệ (
                {customer?.contacts?.length || 0})
              </span>
            ),
            children: (
              <Card
                size="small"
                title="Danh sách người liên hệ"
                extra={
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateContact}
                  >
                    Thêm liên hệ
                  </Button>
                }
              >
                <Table
                  dataSource={customer?.contacts || []}
                  columns={contactColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'dossiers',
            label: (
              <span>
                <FileTextOutlined /> Lịch sử hồ sơ tour (
                {dossiersData?.meta?.total || 0})
              </span>
            ),
            children: (
              <Card size="small" title="Danh sách hồ sơ tour liên quan (API-CONTACT-005)">
                <Table
                  dataSource={dossiersData?.data || []}
                  columns={dossierColumns}
                  rowKey="id"
                  loading={isLoadingDossiers}
                  size="small"
                  pagination={{
                    current: dossierPage,
                    pageSize: 10,
                    total: dossiersData?.meta?.total || 0,
                    onChange: (page) => setDossierPage(page),
                  }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal Thêm / Sửa người liên hệ */}
      {customerId && (
        <ContactModal
          visible={contactModalVisible}
          customerId={customerId}
          contact={selectedContact}
          onCancel={() => setContactModalVisible(false)}
          onSuccess={() => setContactModalVisible(false)}
        />
      )}
    </Drawer>
  );
};
