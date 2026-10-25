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

const actionDescriptionMap: Record<string, string> = {
  CUSTOMER_CREATED: 'Tạo khách hàng',
  CUSTOMER_UPDATED: 'Cập nhật thông tin khách hàng',
  CUSTOMER_DELETED: 'Xóa khách hàng',
  CUSTOMER_STATUS_CHANGED: 'Thay đổi trạng thái khách hàng',
  CUSTOMER_ASSIGNEE_CHANGED: 'Thay đổi nhân viên phụ trách khách hàng',
  CUSTOMER_VIEWED: 'Xem thông tin khách hàng',
  SENSITIVE_DATA_VIEWED: 'Xem thông tin được phân quyền',
  CUSTOMER_LIST_EXPORTED: 'Xuất danh sách khách hàng',
  DOSSIER_CREATED: 'Tạo hồ sơ tour',
  DOSSIER_UPDATED: 'Cập nhật hồ sơ tour',
  DOSSIER_DELETED: 'Xóa hồ sơ tour',
  DOSSIER_STATUS_CHANGED: 'Thay đổi trạng thái hồ sơ tour',
  DOSSIER_ASSIGNEE_CHANGED: 'Thay đổi nhân viên phụ trách hồ sơ tour',
  DOSSIER_VIEWED: 'Xem thông tin hồ sơ tour',
  ESTIMATE_CREATED: 'Tạo báo giá',
  ESTIMATE_UPDATED: 'Cập nhật báo giá',
  ESTIMATE_DELETED: 'Xóa báo giá',
  ESTIMATE_STATUS_CHANGED: 'Thay đổi trạng thái báo giá',
  ESTIMATE_VALUE_CHANGED: 'Thay đổi giá trị báo giá',
  ESTIMATE_VIEWED: 'Xem thông tin báo giá',
  IMPORT_UPLOADED: 'Tải tệp dữ liệu lên để nhập',
  IMPORT_CONFIRMED: 'Xác nhận nhập dữ liệu',
  USER_CREATED: 'Tạo tài khoản người dùng',
  USER_UPDATED: 'Cập nhật tài khoản người dùng',
  USER_DELETED: 'Xóa tài khoản người dùng',
  USER_ROLES_CHANGED: 'Thay đổi vai trò người dùng',
  USER_VIEWED: 'Xem thông tin tài khoản',
  ROLE_CREATED: 'Tạo vai trò',
  ROLE_UPDATED: 'Cập nhật vai trò',
  ROLE_DELETED: 'Xóa vai trò',
  ROLE_PERMISSIONS_CHANGED: 'Thay đổi quyền của vai trò',
  CREATE_DOSSIER: 'Tạo hồ sơ tour',
  UPDATE_ESTIMATE: 'Cập nhật báo giá',
  DELETE_CUSTOMER: 'Xóa khách hàng',
  UPDATE_ROLE: 'Cập nhật vai trò',
};

const auditFieldLabelMap: Record<string, string> = {
  fields: 'Thông tin đã xem',
  customer: 'Khách hàng',
  passengers: 'Hành khách',
  estimates: 'Báo giá',
  assignment: 'Phân công',
  supplierCosts: 'Chi phí nhà cung cấp',
  revenueLines: 'Khoản thu',
  costLines: 'Khoản chi',
  contacts: 'Người liên hệ',
  email: 'Email',
  phone: 'Số điện thoại',
  address: 'Địa chỉ',
  dateOfBirth: 'Ngày sinh',
  status: 'Trạng thái',
  assignedSalesId: 'Nhân viên kinh doanh phụ trách',
  assignedOperatorId: 'Điều hành viên phụ trách',
  roleIds: 'Vai trò',
  permissionIds: 'Quyền truy cập',
  totalAmount: 'Tổng giá trị',
  totalRevenue: 'Tổng doanh thu',
  workflowAction: 'Thao tác quy trình',
  deleted: 'Đã xóa',
  code: 'Mã',
  name: 'Tên',
  description: 'Mô tả',
};

const auditValueLabelMap: Record<string, string> = {
  customer: 'Khách hàng',
  passengers: 'Hành khách',
  estimates: 'Báo giá',
  assignment: 'Phân công',
  supplierCosts: 'Chi phí nhà cung cấp',
  revenueLines: 'Khoản thu',
  costLines: 'Khoản chi',
  email: 'Email',
  phone: 'Số điện thoại',
  address: 'Địa chỉ',
  contacts: 'Người liên hệ',
};

const entityTypeLabelMap: Record<string, string> = {
  dossier: 'Hồ sơ tour',
  customer: 'Khách hàng',
  supplier: 'Nhà cung cấp',
  estimate: 'Báo giá',
  document: 'Tài liệu',
  task: 'Công việc',
  payment: 'Thanh toán',
  user: 'Tài khoản người dùng',
  role: 'Vai trò',
  import_session: 'Lần nhập dữ liệu',
};

function getEntityTypeLabel(type: string): string {
  return entityTypeLabelMap[type] || type || 'Không xác định';
}

function getAuditFieldLabel(key: string): string {
  if (auditFieldLabelMap[key]) return auditFieldLabelMap[key];

  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Chưa có';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  if (typeof value === 'string') {
    return auditValueLabelMap[value] || value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatAuditValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => `${getAuditFieldLabel(key)}: ${formatAuditValue(nestedValue)}`)
      .join('; ');
  }
  return String(value);
}

function getAuditDataEntries(data?: Record<string, any> | null) {
  if (!data) return [];

  return Object.entries(data).map(([key, value]) => ({
    label: getAuditFieldLabel(key),
    value: formatAuditValue(value),
  }));
}

function AuditDataSummary({
  data,
  emptyMessage,
}: {
  data?: Record<string, any> | null;
  emptyMessage: string;
}) {
  const entries = getAuditDataEntries(data);

  if (!entries.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {entries.map((entry, index) => (
        <div
          key={entry.label}
          className={`grid grid-cols-[minmax(140px,0.4fr)_minmax(0,1fr)] gap-4 px-4 py-3 text-sm ${
            index > 0 ? 'border-t border-slate-100' : ''
          }`}
        >
          <Text type="secondary" className="font-medium">
            {entry.label}
          </Text>
          <Text className="break-words text-slate-700">{entry.value}</Text>
        </div>
      ))}
    </div>
  );
}

function getActionDescription(action: string, description?: string | null): string {
  return description || actionDescriptionMap[action] || 'Thao tác hệ thống';
}

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
      width: 260,
      render: (action: string, record) => {
        const description = getActionDescription(
          record.action,
          record.description,
        );
        return (
          <Tooltip title={`Mã thao tác: ${record.action}`}>
            <Tag
              color={getActionColor(action)}
              className="font-semibold text-xs whitespace-normal"
            >
              {description}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Đối tượng',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 130,
      render: (type: string) => (
        <Tooltip title={`Mã đối tượng: ${type}`}>
          <Tag color="blue" className="text-xs">
            {getEntityTypeLabel(type)}
          </Tag>
        </Tooltip>
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
                { label: 'Tạo mới', value: 'CREATE' },
                { label: 'Cập nhật', value: 'UPDATE' },
                { label: 'Xóa', value: 'DELETE' },
                { label: 'Khóa', value: 'LOCK' },
                { label: 'Phê duyệt', value: 'APPROVE' },
                { label: 'Gửi duyệt', value: 'SUBMIT' },
                { label: 'Xuất dữ liệu', value: 'EXPORT' },
                { label: 'Xem thông tin', value: 'VIEWED' },
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
                { label: 'Hồ sơ tour', value: 'dossier' },
                { label: 'Khách hàng', value: 'customer' },
                { label: 'Nhà cung cấp', value: 'supplier' },
                { label: 'Báo giá', value: 'estimate' },
                { label: 'Tài liệu', value: 'document' },
                { label: 'Công việc', value: 'task' },
                { label: 'Thanh toán', value: 'payment' },
                { label: 'Tài khoản người dùng', value: 'user' },
                { label: 'Vai trò', value: 'role' },
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
            <span>Danh sách nhật ký hoạt động (API-AUDIT-001)</span>
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

      {/* Drawer Chi tiết Nhật ký hoạt động (API-AUDIT-002) */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined />
            <span>Chi tiết nhật ký hoạt động (API-AUDIT-002)</span>
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
                <Space orientation="vertical" size={2}>
                  <Tag color={getActionColor(detailLog.action)}>
                    {getActionDescription(
                      detailLog.action,
                      detailLog.description,
                    )}
                  </Tag>
                  <Text type="secondary" code className="text-xs">
                    {detailLog.action}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Loại đối tượng">
                <Tag color="blue">
                  {getEntityTypeLabel(detailLog.entityType)}
                </Tag>
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

            {/* Human-readable before / after summary */}
            <div className="space-y-4">
              <div>
                <Text strong className="text-sm block mb-1">
                  Thông tin trước thao tác
                </Text>
                <AuditDataSummary
                  data={detailLog.beforeData}
                  emptyMessage="Không có thông tin trước thao tác này."
                />
              </div>

              <div>
                <Text strong className="text-sm block mb-1">
                  Thông tin sau thao tác
                </Text>
                <AuditDataSummary
                  data={detailLog.afterData}
                  emptyMessage="Không có thông tin sau thao tác này."
                />
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
