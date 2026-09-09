'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Button,
  Drawer,
  Descriptions,
  Typography,
  Avatar,
  Tooltip,
  Empty,
  Row,
  Col,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  EyeOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useAuditLogDetail, useAuditLogs } from '@/hooks/audit-logs';
import { AuditLogItem } from '@/types/audit-log';
import { useDebounce } from '@/hooks/use-debounce';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const actionColorMap: Record<string, string> = {
  CREATE: 'green',
  INSERT: 'green',
  UPDATE: 'blue',
  MODIFY: 'blue',
  DELETE: 'red',
  REMOVE: 'red',
  LOCK: 'gold',
  UNLOCK: 'orange',
  APPROVE: 'cyan',
  SUBMIT: 'purple',
  EXPORT: 'geekblue',
};

function getActionColor(action: string): string {
  const upper = action?.toUpperCase() || '';
  for (const [key, color] of Object.entries(actionColorMap)) {
    if (upper.includes(key)) {
      return color;
    }
  }
  return 'default';
}

function formatDate(val?: string) {
  if (!val) return '-';
  return new Date(val).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [actionFilter, setActionFilter] = useState<string>();
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<[string | undefined, string | undefined]>([
    undefined,
    undefined,
  ]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const queryParams = useMemo(() => {
    return {
      page,
      pageSize,
      search: debouncedSearch.trim() || undefined,
      action: actionFilter || undefined,
      entityType: entityTypeFilter || undefined,
      from: dateRange[0],
      to: dateRange[1],
    };
  }, [page, pageSize, debouncedSearch, actionFilter, entityTypeFilter, dateRange]);

  const { data, isLoading, refetch, isFetching } = useAuditLogs(queryParams);
  const { data: auditLogDetail, isLoading: isDetailLoading } =
    useAuditLogDetail(selectedLog?.id || '');

  const logs = data?.data || [];
  const total = data?.meta?.total || 0;
  const detailLog = auditLogDetail || selectedLog;

  const handleDateChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([
        dates[0].startOf('day').toISOString(),
        dates[1].endOf('day').toISOString(),
      ]);
    } else {
      setDateRange([undefined, undefined]);
    }
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setActionFilter(undefined);
    setEntityTypeFilter(undefined);
    setDateRange([undefined, undefined]);
    setPage(1);
  };

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => (
        <span className="text-xs font-medium text-slate-700">
          {formatDate(val)}
        </span>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'actor',
      key: 'actor',
      width: 200,
      render: (_, record) => {
        const actor = record.actor;
        return (
          <Space orientation="horizontal" size="small">
            {actor?.avatarUrl ? (
              <Avatar size="small" src={actor.avatarUrl} />
            ) : (
              <Avatar size="small" icon={<UserOutlined />} />
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {actor?.fullName || 'Hệ thống'}
              </div>
              {actor?.email && (
                <div className="text-[11px] text-slate-400 truncate">
                  {actor.email}
                </div>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action: string) => (
        <Tag color={getActionColor(action)} className="font-semibold text-xs">
          {action}
        </Tag>
      ),
    },
    {
      title: 'Đối tượng',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 130,
      render: (type: string) => (
        <Tag color="blue" className="text-xs">
          {type}
        </Tag>
      ),
    },
    {
      title: 'Mã đối tượng',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 160,
      ellipsis: true,
      render: (entityId: string) => (
        <Tooltip title={entityId}>
          <Text code className="text-xs">
            {entityId}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'IP / Request ID',
      key: 'clientInfo',
      width: 180,
      render: (_, record) => (
        <div className="text-[11px] text-slate-500">
          <div>IP: {record.ipAddress || '-'}</div>
          {record.requestId && (
            <div className="text-slate-400 font-mono truncate">
              Req: {record.requestId}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedLog(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header toolbar */}
      <Card size="small" className="ceo-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm theo hành động, loại đối tượng, IP..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Hành động"
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              allowClear
              className="w-full"
              options={[
                { label: 'Tất cả hành động', value: '' },
                { label: 'CREATE', value: 'CREATE' },
                { label: 'UPDATE', value: 'UPDATE' },
                { label: 'DELETE', value: 'DELETE' },
                { label: 'LOCK', value: 'LOCK' },
                { label: 'APPROVE', value: 'APPROVE' },
                { label: 'SUBMIT', value: 'SUBMIT' },
                { label: 'EXPORT', value: 'EXPORT' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Loại đối tượng"
              value={entityTypeFilter}
              onChange={(val) => {
                setEntityTypeFilter(val);
                setPage(1);
              }}
              allowClear
              className="w-full"
              options={[
                { label: 'Tất cả đối tượng', value: '' },
                { label: 'dossier', value: 'dossier' },
                { label: 'customer', value: 'customer' },
                { label: 'supplier', value: 'supplier' },
                { label: 'estimate', value: 'estimate' },
                { label: 'document', value: 'document' },
                { label: 'task', value: 'task' },
                { label: 'payment', value: 'payment' },
                { label: 'user', value: 'user' },
                { label: 'role', value: 'role' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              className="w-full"
              placeholder={['Từ ngày', 'Đến ngày']}
              onChange={handleDateChange}
            />
          </Col>
          <Col xs={24} sm={12} md={4} className="flex justify-end gap-2">
            <Button onClick={handleReset}>Đặt lại</Button>
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined spin={isFetching} />}
                onClick={() => refetch()}
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Audit Logs Table */}
      <Card
        size="small"
        className="ceo-card"
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined />
            <span>Danh sách nhật ký kiểm toán (API-AUDIT-001)</span>
            <Tag color="blue">{total} bản ghi</Tag>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Drawer Chi tiết Nhật ký kiểm toán (API-AUDIT-002) */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined />
            <span>Chi tiết nhật ký kiểm toán (API-AUDIT-002)</span>
          </div>
        }
        placement="right"
        styles={{ wrapper: { width: 640, maxWidth: '100vw' } }}
        onClose={() => setSelectedLog(null)}
        open={!!selectedLog}

      >
        {isDetailLoading ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : detailLog ? (
          <div className="space-y-6">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Mã Audit Log">
                <Text copyable={{ text: detailLog.id }} code>
                  {detailLog.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian thực hiện">
                <Text strong>{formatDate(detailLog.createdAt)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Người thực hiện">
                <Space>
                  {detailLog.actor?.fullName || 'Hệ thống'}
                  {detailLog.actor?.email && (
                    <Text type="secondary">({detailLog.actor.email})</Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Hành động">
                <Tag color={getActionColor(detailLog.action)}>
                  {detailLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Loại đối tượng">
                <Tag color="blue">{detailLog.entityType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Mã đối tượng">
                <Text copyable code>
                  {detailLog.entityId}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ IP">
                {detailLog.ipAddress || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="User Agent">
                <Text className="text-xs break-all">
                  {detailLog.userAgent || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Request ID">
                <Text code className="text-xs">
                  {detailLog.requestId || '-'}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {/* Before / After Data JSON Diff Viewer */}
            <div className="space-y-4">
              <div>
                <Text strong className="text-sm block mb-1">
                  Dữ liệu trước thay đổi (Before Data):
                </Text>
                {detailLog.beforeData ? (
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs overflow-auto max-h-64 font-mono">
                    {JSON.stringify(detailLog.beforeData, null, 2)}
                  </pre>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-md text-xs text-slate-400 italic">
                    Không có dữ liệu trước thay đổi (Thao tác tạo mới hoặc ghi log cơ bản)
                  </div>
                )}
              </div>

              <div>
                <Text strong className="text-sm block mb-1">
                  Dữ liệu sau thay đổi (After Data):
                </Text>
                {detailLog.afterData ? (
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs overflow-auto max-h-64 font-mono">
                    {JSON.stringify(detailLog.afterData, null, 2)}
                  </pre>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-md text-xs text-slate-400 italic">
                    Không có dữ liệu sau thay đổi
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Empty description="Chưa có dữ liệu" />
        )}
      </Drawer>
    </div>
  );
}
