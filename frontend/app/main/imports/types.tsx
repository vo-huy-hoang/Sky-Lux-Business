import React from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ImportRow } from '@/types/import';

export function getRawValue(record: ImportRow, key: string) {
  return record.normalizedData?.[key] || record.rawData?.[key] || '-';
}

export function renderStatusTag(status?: string) {
  switch (status) {
    case 'PROCESSING':
      return (
        <Tag icon={<SyncOutlined spin />} className="skylux-status-info">
          Đang xử lý
        </Tag>
      );
    case 'READY_FOR_REVIEW':
      return <Tag className="skylux-status-warning">Sẵn sàng kiểm tra</Tag>;
    case 'CONFIRMED':
      return (
        <Tag icon={<CheckCircleOutlined />} className="skylux-status-valid">
          Đã nhập dữ liệu
        </Tag>
      );
    case 'FAILED':
      return (
        <Tag icon={<CloseCircleOutlined />} className="skylux-status-danger">
          Thất bại
        </Tag>
      );
    default:
      return <Tag>{status || 'Chưa khởi tạo'}</Tag>;
  }
}
