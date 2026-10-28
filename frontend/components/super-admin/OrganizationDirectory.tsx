'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Form, Input, Modal, Popconfirm, Select, Skeleton, Space, Table, Tag, Typography, message } from 'antd';
import { BankOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { organizationsService } from '@/services/organizations.service';
import type { OrganizationItem } from '@/types/organization';
import { queryKeys } from '@/lib/query-keys';
import styles from './organizations.module.css';

const { Title, Text } = Typography;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
}

export function OrganizationDirectory() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [editingOrganization, setEditingOrganization] = useState<OrganizationItem | null>(null);
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: ({ signal }) => organizationsService.listOrganizations({ signal }),
    retry: (failureCount, queryError) => {
      if (queryError instanceof Error && (queryError.name === 'CanceledError' || queryError.name === 'AbortError')) {
        return false;
      }

      const status = (queryError as { status?: number })?.status;
      const isTransient = status === undefined || status === 429 || status >= 500;
      return isTransient && failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });
  const updateMutation = useMutation({
    mutationFn: (values: Partial<OrganizationItem>) =>
      organizationsService.updateOrganization(editingOrganization!.id, values),
    onSuccess: () => {
      message.success('Đã cập nhật doanh nghiệp');
      setEditingOrganization(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error: any) => message.error(error.message || 'Không thể cập nhật doanh nghiệp'),
  });
  const deleteMutation = useMutation({
    mutationFn: organizationsService.deleteOrganization,
    onSuccess: () => {
      message.success('Đã xóa doanh nghiệp khỏi danh sách');
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error: any) => message.error(error.message || 'Không thể xóa doanh nghiệp'),
  });

  useEffect(() => {
    if (!editingOrganization) return;

    form.setFieldsValue({
      name: editingOrganization.name || '',
      contactEmail: editingOrganization.contactEmail || '',
      phone: editingOrganization.phone || '',
      industry: editingOrganization.industry || '',
      timezone: editingOrganization.timezone || '',
      status: editingOrganization.status || 'ACTIVE',
    });
  }, [editingOrganization, form]);

  const organizations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (data || []).filter((organization) => {
      const matchesSearch = !normalizedSearch || [organization.name, organization.code, organization.slug]
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesStatus = !status || organization.status?.toUpperCase() === status;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, status]);

  const columns: ColumnsType<OrganizationItem> = [
    {
      title: 'Tên doanh nghiệp',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (name: string, record) => (
        <div className={styles.organizationName}>
          <span className={styles.organizationIcon}><BankOutlined /></span>
          <span><strong>{name}</strong><small>{record.slug}</small></span>
        </div>
      ),
    },
    { title: 'Mã doanh nghiệp', dataIndex: 'code', key: 'code', width: 180 },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 150,
      render: (value: string) => <Tag color={value?.toUpperCase() === 'ACTIVE' ? 'green' : 'default'}>{value?.toUpperCase() === 'ACTIVE' ? 'Hoạt động' : value || 'Chưa xác định'}</Tag>,
    },
    { title: 'Múi giờ', dataIndex: 'timezone', key: 'timezone', width: 200 },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 130, render: formatDate },
    {
      title: 'Hành động',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, organization) => (
        <Space size={6}>
          <Button
            aria-label={`Sửa ${organization.name}`}
            title="Sửa doanh nghiệp"
            icon={<EditOutlined />}
            onClick={() => setEditingOrganization(organization)}
          />
          <Popconfirm
            title="Xóa doanh nghiệp này?"
            description="Doanh nghiệp sẽ được xóa mềm khỏi danh sách; dữ liệu tenant được lưu trữ."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(organization.id)}
          >
            <Button
              danger
              aria-label={`Xóa ${organization.name}`}
              title="Xóa doanh nghiệp"
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.directoryPage}>
      <div className={styles.directoryIntro}>
        <div>
          <div className={styles.eyebrow}>QUẢN TRỊ NỀN TẢNG</div>
          <Title level={2}>Doanh nghiệp</Title>
          <Text type="secondary">Quản lý doanh nghiệp và tenant đang sử dụng Sky-Lux CRM.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/organizations/new')} className={styles.primaryButton}>
          Thêm mới doanh nghiệp
        </Button>
      </div>

      <Card className={styles.directoryCard}>
        <div className={styles.toolbar}>
          <Input
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên, mã hoặc tenant key"
            aria-label="Tìm doanh nghiệp"
            className={styles.searchInput}
          />
          <Select
            allowClear
            value={status}
            onChange={setStatus}
            placeholder="Tất cả trạng thái"
            aria-label="Lọc trạng thái doanh nghiệp"
            options={[{ label: 'Hoạt động', value: 'ACTIVE' }, { label: 'Tạm ngưng', value: 'INACTIVE' }]}
            className={styles.statusSelect}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching} aria-label="Tải lại danh sách">Tải lại</Button>
        </div>

        {isError ? (
            <Alert
              type="error"
              showIcon
              title="Không tải được danh sách doanh nghiệp"
              description={error instanceof Error && error.message
                ? error.message
                : 'Vui lòng kiểm tra kết nối API và thử lại.'}
              action={<Button size="small" onClick={() => refetch()}>Thử lại</Button>}
            />
        ) : isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : organizations.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={data?.length ? 'Không tìm thấy doanh nghiệp phù hợp' : 'Chưa có doanh nghiệp nào'}>
            {!data?.length && <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/organizations/new')}>Tạo doanh nghiệp đầu tiên</Button>}
          </Empty>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={organizations}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} doanh nghiệp` }}
            scroll={{ x: 1040 }}
            className={styles.organizationTable}
          />
        )}
      </Card>

      <Modal
        title="Sửa thông tin doanh nghiệp"
        open={Boolean(editingOrganization)}
        onCancel={() => setEditingOrganization(null)}
        onOk={() => form.validateFields().then((values) => updateMutation.mutate(values))}
        confirmLoading={updateMutation.isPending}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="pt-4">
          <Form.Item name="name" label="Tên doanh nghiệp" rules={[{ required: true, message: 'Vui lòng nhập tên doanh nghiệp' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="contactEmail" label="Email liên hệ" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="industry" label="Ngành nghề">
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="timezone" label="Múi giờ">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[{ label: 'Hoạt động', value: 'ACTIVE' }, { label: 'Tạm ngưng', value: 'INACTIVE' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

