'use client';

import React from 'react';
import { Button, Card, Empty, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  ImportError,
  ImportRow,
  ImportSession,
  PaginatedImportErrorsResponse,
  PaginatedImportRowsResponse,
} from '@/types/import';
import { getRawValue } from '../types';

const { Text } = Typography;

export interface ImportPreviewTableProps {
  session?: ImportSession;
  previewData?: PaginatedImportRowsResponse;
  errorsData?: PaginatedImportErrorsResponse;
  isLoading: boolean;
  activeTab: 'ALL' | 'VALID' | 'ERROR';
  onTabChange: (tab: 'ALL' | 'VALID' | 'ERROR') => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRowEdit: (record: ImportRow) => void;
}

export function ImportPreviewTable({
  session,
  previewData,
  errorsData,
  isLoading,
  activeTab,
  onTabChange,
  page,
  pageSize,
  onPageChange,
  onRowEdit,
}: ImportPreviewTableProps) {
  const columns = [
    {
      title: 'Dòng',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 72,
      render: (num: number) => <Text strong>{num}</Text>,
    },
    {
      title: 'Mô tả hồ sơ',
      key: 'dossierInfo',
      render: (_: unknown, record: ImportRow) => {
        const code = getRawValue(record, 'code') || record.rawData?.['Mã hồ sơ'];
        const name = getRawValue(record, 'name') || record.rawData?.['Tên hồ sơ'];
        return (
          <div className="flex flex-col gap-0.5">
            <Text strong>{code || '-'}</Text>
            <Text>{name || '-'}</Text>
            <Text type="secondary" className="text-xs">
              {getRawValue(record, 'route') || record.rawData?.['Tuyến đường'] || '-'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customerInfo',
      render: (_: unknown, record: ImportRow) => (
        <div className="flex flex-col gap-0.5">
          <Space>
            <UserOutlined className="text-[var(--color-primary-700)]" />
            <Text strong>
              {getRawValue(record, 'customerName') || record.rawData?.['Tên khách hàng'] || '-'}
            </Text>
          </Space>
          <Text type="secondary" className="text-xs">
            {[
              record.normalizedData?.phone || record.rawData?.['Số điện thoại'],
              record.normalizedData?.email || record.rawData?.Email,
            ]
              .filter(Boolean)
              .join(' | ') || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'dates',
      width: 160,
      render: (_: unknown, record: ImportRow) => (
        <div className="flex flex-col">
          <Text className="text-xs">
            Bắt đầu: {record.normalizedData?.startDate || record.rawData?.['Ngày bắt đầu'] || '-'}
          </Text>
          <Text className="text-xs">
            Kết thúc: {record.normalizedData?.endDate || record.rawData?.['Ngày kết thúc'] || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, record: ImportRow) => {
        if (status === 'VALID') {
          return (
            <Tag icon={<CheckCircleOutlined />} className="skylux-status-valid">
              Hợp lệ
            </Tag>
          );
        }

        if (status === 'ERROR') {
          const rowErrors =
            errorsData?.data?.filter(
              (error: ImportError) => error.rowNumber === record.rowNumber,
            ) || [];
          return (
            <Tooltip
              title={
                rowErrors.length
                  ? rowErrors.map((error: ImportError) => error.errorMessage).join('; ')
                  : 'Dữ liệu không hợp lệ'
              }
            >
              <Tag icon={<CloseCircleOutlined />} className="skylux-status-danger">
                Có lỗi ({rowErrors.length || 1})
              </Tag>
            </Tooltip>
          );
        }

        if (status === 'IMPORTED') {
          return (
            <Tag icon={<CheckCircleOutlined />} className="skylux-status-info">
              Đã import
            </Tag>
          );
        }

        return <Tag className="skylux-status-warning">Chờ kiểm tra</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      render: (_: unknown, record: ImportRow) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          className="skylux-outline-button"
          onClick={() => onRowEdit(record)}
          disabled={session?.status === 'CONFIRMED'}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <Card className="skylux-card">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onTabChange(key as 'ALL' | 'VALID' | 'ERROR')}
        items={[
          { key: 'ALL', label: `Tất cả (${session?.totalRows || 0})` },
          { key: 'VALID', label: `Hợp lệ (${session?.validRows || 0})` },
          { key: 'ERROR', label: `Có lỗi (${session?.errorRows || 0})` },
        ]}
      />
      <Table
        columns={columns}
        dataSource={previewData?.data || []}
        rowKey="id"
        loading={isLoading}
        className="skylux-table"
        rowClassName={(record: ImportRow) =>
          record.status === 'ERROR' ? 'bg-[var(--color-danger-soft)]' : ''
        }
        locale={{ emptyText: <Empty description="Chưa có dữ liệu preview từ API" /> }}
        scroll={{ x: 980 }}
        pagination={{
          current: page,
          pageSize,
          total: previewData?.meta?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: onPageChange,
        }}
      />
    </Card>
  );
}
