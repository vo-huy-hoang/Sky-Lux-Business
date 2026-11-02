'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Tabs,
  Table,
  Input,
  Select,
} from 'antd';
import {
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers.service';
import {
  SupplierItem,
  SupplierStatus,
  SupplierDossierHistoryItem,
} from '@/types/supplier';
import { queryKeys } from '@/lib/query-keys';
import { useSupplierDossiers } from '@/hooks/use-suppliers';
import dayjs from 'dayjs';
import { formatCurrency } from '@/lib/financial-calculations';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  const [activeTab, setActiveTab] = useState<'info' | 'tours'>('info');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'COMPLETED_ONLY'>('COMPLETED_ONLY');

  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);
  const canViewHistory =
    hasPermission('supplier.view') ||
    hasPermission('supplier.manage') ||
    hasPermission('dossier.cost.view') ||
    hasRole(['CEO_ADMIN', 'SUPER_ADMIN']);

  React.useEffect(() => {
    if (visible) {
      setActiveTab('info');
      setPage(1);
      setSearchTerm('');
      setFilterMode('COMPLETED_ONLY');
    }
  }, [visible]);

  React.useEffect(() => {
    if (!canViewHistory && activeTab === 'tours') {
      setActiveTab('info');
    }
  }, [canViewHistory, activeTab]);

  const {
    data: supplier,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.suppliers.detail(supplierId || undefined),
    queryFn: ({ signal }) =>
      supplierId ? suppliersService.getSupplier(supplierId, { signal }) : null,
    enabled: Boolean(visible && supplierId),
  });

  const {
    data: historyResponse,
    isLoading: isLoadingHistory,
    isFetching: isFetchingHistory,
  } = useSupplierDossiers(visible && canViewHistory ? supplierId : null, {
    page,
    limit: 10,
    search: searchTerm.trim() || undefined,
    completedOnly: filterMode === 'COMPLETED_ONLY',
  });

  const historyItems = historyResponse?.data || [];
  const totalHistoryCount = historyResponse?.meta?.total || 0;

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

  const getDossierStatusTag = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Tag color="success">Hoàn thành</Tag>;
      case 'LOCKED':
        return <Tag color="purple">Đã khóa</Tag>;
      case 'APPROVED':
        return <Tag color="cyan">Đã duyệt</Tag>;
      case 'IN_REVIEW':
        return <Tag color="warning">Đang xử lý</Tag>;
      case 'SUBMITTED':
      case 'RESUBMITTED':
        return <Tag color="blue">Chờ duyệt</Tag>;
      case 'DRAFT':
        return <Tag color="default">Mới tạo</Tag>;
      case 'CANCELLED':
        return <Tag color="error">Đã hủy</Tag>;
      default:
        return <Tag>{status || 'N/A'}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã tour',
      dataIndex: 'dossierCode',
      key: 'dossierCode',
      width: 140,
      render: (code: string, record: SupplierDossierHistoryItem) => (
        <Link
          href={`/dossiers/${record.dossierId}?tab=cost`}
          target="_blank"
          className="group inline-flex items-center gap-1 font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline"
          title="Bấm để mở chi tiết dự toán chi phí của tour này"
        >
          <span>{code}</span>
          <ExportOutlined className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity" />
        </Link>
      ),
    },
    {
      title: 'Tên tour',
      dataIndex: 'dossierTitle',
      key: 'dossierTitle',
      render: (title: string) => (
        <div className="max-w-[220px] truncate font-medium text-slate-800" title={title}>
          {title}
        </div>
      ),
    },
    {
      title: 'Khởi hành',
      dataIndex: 'departureDate',
      key: 'departureDate',
      width: 110,
      render: (date?: string) =>
        date ? (
          <span className="text-xs tabular-nums text-slate-600">
            {dayjs(date).format('DD/MM/YYYY')}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      title: 'Phụ trách',
      dataIndex: 'operatorOrSalesName',
      key: 'operatorOrSalesName',
      width: 130,
      render: (name?: string) =>
        name ? (
          <div className="flex items-center gap-1 text-xs text-slate-700 truncate max-w-[120px]" title={name}>
            <UserOutlined className="text-slate-400 text-[10px] shrink-0" />
            <span className="truncate">{name}</span>
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'lineCount',
      key: 'lineCount',
      width: 85,
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="cyan" className="rounded-md px-1.5 text-[11px] font-medium border-0 bg-cyan-50 text-cyan-700">
          {count} mục
        </Tag>
      ),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 130,
      align: 'right' as const,
      render: (amount: number) => (
        <span className="text-xs font-bold tabular-nums text-emerald-700">
          {formatCurrency(amount || 0)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => getDossierStatusTag(status),
    },
  ];

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
      styles={{ wrapper: { width: 760, maxWidth: '100vw' } }}
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
          <Spin size="large" description="Đang tải thông tin..." />
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
          <div style={{ marginBottom: 16 }}>
            <Title level={4} style={{ marginBottom: 4 }}>
              {supplier.name}
            </Title>
            <Space separator={<Divider orientation="vertical" />}>
              <Text type="secondary">Mã: {supplier.code}</Text>
              {getStatusTag(supplier.status)}
              {supplier.supplierType && (
                <Tag color="purple">{supplier.supplierType.name}</Tag>
              )}
            </Space>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'info' | 'tours')}
            items={[
              {
                key: 'info',
                label: (
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <InfoCircleOutlined />
                    <span>Thông tin chung</span>
                  </span>
                ),
                children: (
                  <div className="space-y-5 pt-2">
                    <Descriptions
                      title="Thông tin đối tác"
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
                      <Descriptions.Item label="Tổng chi phí đã ghi nhận">
                        <div className="flex items-center justify-between">
                          <Text strong className="text-emerald-700 font-bold tabular-nums text-sm">
                            {formatCurrency(supplier.totalAmount || 0)}
                          </Text>
                          <Button
                            type="link"
                            size="small"
                            className="p-0 text-xs font-medium text-[var(--color-primary-600)]"
                            onClick={() => setActiveTab('tours')}
                          >
                            Xem lịch sử các tour →
                          </Button>
                        </div>
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
                ),
              },
              ...(canViewHistory
                ? [
                    {
                      key: 'tours',
                      label: (
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <FileTextOutlined />
                          <span>Lịch sử cung ứng tour</span>
                          {totalHistoryCount > 0 && (
                            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {totalHistoryCount}
                            </span>
                          )}
                        </span>
                      ),
                      children: (
                        <div className="pt-2 space-y-3">
                          {/* Filter & Search Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <Input
                              placeholder="Tìm theo mã tour, tên tour..."
                              prefix={<SearchOutlined className="text-slate-400" />}
                              allowClear
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                              }}
                              className="sm:w-64"
                            />
                            <Select
                              value={filterMode}
                              onChange={(val) => {
                                setFilterMode(val);
                                setPage(1);
                              }}
                              className="w-full sm:w-56"
                              options={[
                                { label: 'Tất cả tour phát sinh', value: 'ALL' },
                                { label: 'Chỉ tour hoàn tất / khóa sổ', value: 'COMPLETED_ONLY' },
                              ]}
                            />
                          </div>

                          {/* Summary Bar */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                            <span className="text-slate-600">
                              Tổng cộng: <strong className="text-slate-900">{totalHistoryCount} tour</strong>
                            </span>
                            <span className="text-slate-600">
                              Chi phí hoàn tất đã ghi nhận:{' '}
                              <strong className="text-emerald-700 font-bold text-sm">
                                {formatCurrency(supplier.totalAmount || 0)}
                              </strong>
                            </span>
                          </div>

                          {/* Tour History Table */}
                          <Table
                            columns={columns}
                            dataSource={historyItems}
                            rowKey="dossierId"
                            loading={isLoadingHistory || isFetchingHistory}
                            size="small"
                            scroll={{ x: 680 }}
                            pagination={{
                              current: page,
                              pageSize: 10,
                              total: totalHistoryCount,
                              onChange: (p) => setPage(p),
                              showSizeChanger: false,
                              size: 'small',
                            }}
                            locale={{
                              emptyText: (
                                <div className="py-8 px-4 text-center">
                                  <FolderOpenOutlined className="text-3xl text-slate-300 mb-2" />
                                  <p className="text-sm font-semibold text-slate-700 mb-1">
                                    Chưa có tour nào trong danh sách
                                  </p>
                                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Khi có tour sử dụng dịch vụ của nhà cung cấp này, thông tin chi tiết từng đoàn sẽ xuất hiện tại đây.
                                  </p>
                                </div>
                              ),
                            }}
                          />
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}
    </Drawer>
  );
};
