'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Table, Tag, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { DossierItem } from '@/types/dossier';
import { themeTokens } from '@/lib/theme/tokens.config';

const { Text } = Typography;

const statusMeta: Record<string, { label: string; color: string; className: string }> = {
  DRAFT: { label: 'Bản nháp', color: themeTokens.neutral.textMuted, className: 'op-status-neutral' },
  SUBMITTED: { label: 'Chờ duyệt', color: themeTokens.brand.gold.strong, className: 'op-status-gold' },
  IN_REVIEW: { label: 'Đang xử lý', color: themeTokens.brand.primary.hoverBorder, className: 'op-status-info' },
  APPROVED: { label: 'Đã duyệt', color: themeTokens.semantic.success.main, className: 'op-status-success' },
  REJECTED: { label: 'Từ chối', color: themeTokens.semantic.danger.main, className: 'op-status-danger' },
  COMPLETED: { label: 'Hoàn thành', color: themeTokens.semantic.success.dark, className: 'op-status-success' },
  CANCELLED: { label: 'Đã hủy', color: themeTokens.neutral.textMuted, className: 'op-status-neutral' },
  EDITING: { label: 'Đang sửa', color: themeTokens.brand.gold.strong, className: 'op-status-warning' },
};

function getStatus(status?: string) {
  return (
    statusMeta[status || ''] || {
      label: status || 'Chưa rõ',
      color: themeTokens.neutral.textMuted,
      className: 'op-status-neutral',
    }
  );
}

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '-';
}

interface OperatorDossierStatusTableProps {
  recentDossiers: DossierItem[];
  loading: boolean;
}

export default function OperatorDossierStatusTable({
  recentDossiers,
  loading,
}: OperatorDossierStatusTableProps) {
  const dossierColumns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 280,
      render: (value: string, record: DossierItem) => (
        <Link href={`/dossiers/${record.id}`}>
          <Text strong className="text-[var(--op-primary-900)] hover:underline whitespace-nowrap">
            {value}
          </Text>
        </Link>
      ),
    },
    {
      title: 'Sales phụ trách',
      key: 'sales',
      width: 160,
      render: (_: unknown, record: DossierItem) => record.salesUser?.fullName || '-',
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 180,
      render: (_: unknown, record: DossierItem) =>
        record.customer?.displayName || record.name,
    },
    {
      title: 'Khởi hành',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (value?: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: string) => (
        <Tag className={getStatus(value).className}>{getStatus(value).label}</Tag>
      ),
    },
  ];

  return (
    <Card
      className="op-card"
      title={
        <h2 className="text-[15px] font-bold text-slate-900 m-0 leading-normal">
          Hồ sơ gần đây
        </h2>
      }
      extra={
        <Link href="/dossiers">
          Xem tất cả <RightOutlined />
        </Link>
      }
    >
      <Table
        className="op-table"
        size="small"
        rowKey="id"
        dataSource={recentDossiers}
        columns={dossierColumns}
        loading={loading}
        pagination={false}
        scroll={{ x: 920 }}
      />
    </Card>
  );
}
