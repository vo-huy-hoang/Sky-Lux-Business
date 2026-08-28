'use client';

import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers.service';
import { SupplierItem, SupplierStatus } from '@/types/supplier';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface SupplierDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  supplierId: string | null;
  onEdit?: (supplier: SupplierItem) => void;
}

export const SupplierDetailDrawer: React.FC<SupplierDetailDrawerProps> = ({
  visible,
  onClose,
  supplierId,
  onEdit,
}) => {
  const {
    data: supplier,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => (supplierId ? suppliersService.getSupplier(supplierId) : null),
    enabled: Boolean(visible && supplierId),
  });

  const getStatusTag = (status?: SupplierStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Tag color="success">Hoạt động</Tag>;
      case 'INACTIVE':
        return <Tag color="default">Ngừng hoạt động</Tag>;
      case 'LOCKED':
        return <Tag color="error">Đang khóa</Tag>;
      default:
        return <Tag>{status || 'N/A'}</Tag>;
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <Text strong style={{ fontSize: 16 }}>
            Chi tiết nhà cung cấp
          </Text>
          {supplier?.code && <Tag color="blue">{supplier.code}</Tag>}
        </Space>
      }
      placement="right"
      styles={{ wrapper: { width: 640, maxWidth: '100vw' } }}
      onClose={onClose}
      open={visible}
      extra={
        supplier && (
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                onEdit?.(supplier);
              }}
            >
              Chỉnh sửa
            </Button>
          </Space>
        )
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Đang tải thông tin..." />
        </div>
      ) : error ? (
        <Alert
          type="error"
          title="Không thể tải thông tin nhà cung cấp"
          description={(error as Error).message}
          showIcon
        />
      ) : !supplier ? null : (
        <div>
          <div style={{ marginBottom: 20 }}>
            <Title level={4} style={{ marginBottom: 4 }}>
              {supplier.name}
            </Title>
            <Space split={<Divider type="vertical" />}>
              <Text type="secondary">Mã: {supplier.code}</Text>
              {getStatusTag(supplier.status)}
              {supplier.supplierType && (
                <Tag color="purple">{supplier.supplierType.name}</Tag>
              )}
            </Space>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions
            title="Thông tin chung"
            bordered
            column={1}
            size="small"
            styles={{ label: { width: '180px', fontWeight: 500 } }}
          >
            <Descriptions.Item label="Mã nhà cung cấp">
              <Text copyable strong>
                {supplier.code}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tên nhà cung cấp">
              {supplier.name}
            </Descriptions.Item>
            <Descriptions.Item label="Mã số thuế">
              {supplier.taxCode ? (
                <Text copyable>{supplier.taxCode}</Text>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Loại nhà cung cấp">
              {supplier.supplierType ? (
                supplier.supplierType.name
              ) : (
                <Text type="secondary">Chưa phân loại</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {getStatusTag(supplier.status)}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '20px 0 16px 0' }} />

          <Descriptions
            title="Thông tin liên hệ & Địa chỉ"
            bordered
            column={1}
            size="small"
            styles={{ label: { width: '180px', fontWeight: 500 } }}
          >
            <Descriptions.Item label="Người đại diện liên hệ">
              {supplier.contactName ? (
                <Space>
                  <UserOutlined />
                  <Text>{supplier.contactName}</Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {supplier.phone ? (
                <Space>
                  <PhoneOutlined />
                  <a href={`tel:${supplier.phone}`}>{supplier.phone}</a>
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Email liên hệ">
              {supplier.email ? (
                <Space>
                  <MailOutlined />
                  <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {supplier.address ? (
                <Space align="start">
                  <EnvironmentOutlined style={{ marginTop: 4 }} />
                  <Text>{supplier.address}</Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '20px 0 16px 0' }} />

          <Descriptions
            title="Điều khoản & Thanh toán"
            bordered
            column={1}
            size="small"
            styles={{ label: { width: '180px', fontWeight: 500 } }}
          >
            <Descriptions.Item label="Điều khoản thanh toán">
              {supplier.paymentTerms ? (
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {supplier.paymentTerms}
                </Paragraph>
              ) : (
                <Text type="secondary">Chưa thiết lập</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '20px 0 16px 0' }} />

          <Descriptions
            title="Thông tin hệ thống"
            bordered
            column={1}
            size="small"
            styles={{ label: { width: '180px', fontWeight: 500 } }}
          >
            <Descriptions.Item label="Ngày tạo">
              <Space>
                <CalendarOutlined />
                <Text>
                  {supplier.createdAt
                    ? dayjs(supplier.createdAt).format('DD/MM/YYYY HH:mm:ss')
                    : 'N/A'}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lần cuối">
              <Space>
                <CalendarOutlined />
                <Text>
                  {supplier.updatedAt
                    ? dayjs(supplier.updatedAt).format('DD/MM/YYYY HH:mm:ss')
                    : 'N/A'}
                </Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </Drawer>
  );
};
