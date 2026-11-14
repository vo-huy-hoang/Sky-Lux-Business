'use client';

import React, { useRef, useState, useMemo } from 'react';
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
  App,
  Tooltip,
  Modal,
  Alert,
  Progress,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  PlusOutlined,
  ReloadOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers.service';
import { CreateSupplierInput, SupplierItem, SupplierStatus } from '@/types/supplier';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierDetailDrawer } from './SupplierDetailDrawer';
import dayjs from 'dayjs';
import { formatCurrency } from '@/lib/financial-calculations';
import { queryKeys } from '@/lib/query-keys';
import { useDebounce } from '@/hooks/use-debounce';
import {
  parseSupplierExcel,
  SupplierImportParseResult,
} from '../utils/excel-supplier-parser';
import {
  stripVietnameseDiacritics,
  getCategoryBadgeColor,
} from '@/components/dossiers/edit-import/utils/supplier-category-matcher';

const { Title, Text } = Typography;
const { Option } = Select;

export function SupplierManagementContent() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState<SupplierStatus | undefined>();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(
    null,
  );
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<SupplierImportParseResult | null>(null);
  const [previewSearchText, setPreviewSearchText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResultErrors, setImportResultErrors] = useState<string[]>([]);

  const filteredPreviewRows = useMemo(() => {
    if (!importPreview?.rows) return [];
    if (!previewSearchText.trim()) return importPreview.rows;
    const searchLower = stripVietnameseDiacritics(previewSearchText);
    return importPreview.rows.filter((row) => {
      const code = stripVietnameseDiacritics(row.input.code || '');
      const name = stripVietnameseDiacritics(row.input.name || '');
      const type = stripVietnameseDiacritics(row.input.supplierTypeName || '');
      return (
        code.includes(searchLower) ||
        name.includes(searchLower) ||
        type.includes(searchLower)
      );
    });
  }, [importPreview?.rows, previewSearchText]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.suppliers.list({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status,
    }),
    queryFn: ({ signal }) =>
      suppliersService.getSuppliers(
        {
          page,
          limit: pageSize,
          search: debouncedSearch || undefined,
          status,
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
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

  const handleExcelSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const parseResult = await parseSupplierExcel(buffer, file.name);

      if (parseResult.rows.length === 0) {
        message.error(
          parseResult.errors[0] ||
            'Sheet đầu tiên không có dòng nhà cung cấp hợp lệ',
        );
        return;
      }

      setImportResultErrors([]);
      setPreviewSearchText('');
      setImportPreview(parseResult);
    } catch {
      message.error(
        'Không đọc được file Excel. Vui lòng chọn file .xlsx hoặc .xls hợp lệ.',
      );
    }
  };

  const handleImportSuppliers = async () => {
    if (!importPreview || isImporting || importPreview.rows.length === 0) return;
    setIsImporting(true);
    setImportResultErrors([]);

    try {
      const payload = importPreview.rows.map((row) => row.input);
      const res = await suppliersService.batchCreateSuppliers({
        suppliers: payload,
      });
      const importedCount = res.imported ?? payload.length;

      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      setIsImporting(false);
      setImportResultErrors([]);
      message.success(
        `Đã nhập thành công ${importedCount} nhà cung cấp vào hệ thống`,
      );
      setImportPreview(null);
      setPreviewSearchText('');
    } catch (error: any) {
      setIsImporting(false);
      const rawMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Có lỗi xảy ra khi nhập danh sách nhà cung cấp';

      const errorList = Array.isArray(rawMessage)
        ? rawMessage
        : [String(rawMessage)];
      setImportResultErrors(errorList);
      message.error(errorList[0] || 'Nhập danh sách nhà cung cấp thất bại');
    }
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

  const columns: ColumnsType<SupplierItem> = [
    {
      title: 'Mã NCC',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      ellipsis: true,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tên nhà cung cấp',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
      render: (text: string, record: SupplierItem) => (
        <div className="flex flex-col">
          <Text strong>{text}</Text>
          {record.address && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.address}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Loại NCC',
      dataIndex: 'supplierType',
      key: 'supplierType',
      width: 130,
      ellipsis: true,
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
      width: 140,
      responsive: ['xl'],
      ellipsis: true,
      render: (_: any, record: SupplierItem) => (
        <div className="flex flex-col">
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
        </div>
      ),
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      width: 120,
      responsive: ['xxl'],
      ellipsis: true,
      render: (taxCode?: string) =>
        taxCode ? <Text copyable>{taxCode}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      responsive: ['xl'],
      align: 'right' as const,
      render: (amount?: number) => (
        <Text strong className="tabular-nums text-slate-800">
          {formatCurrency(amount || 0)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (supplierStatus: SupplierStatus) => getStatusTag(supplierStatus),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      responsive: ['xxl'],
      render: (date: string) =>
        date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 112,
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
    <div className="space-y-5">
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
        <Space size="small" wrap>
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelSelected}
            style={{ display: 'none' }}
            aria-label="Chọn file Excel nhà cung cấp"
          />
          <Button
            icon={<ImportOutlined />}
            size="large"
            onClick={() => importFileRef.current?.click()}
          >
            Import Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleOpenCreate}
          >
            Thêm nhà cung cấp
          </Button>
        </Space>
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
            loading={isFetching && !isLoading}
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
          dataSource={data?.data || []}
          rowKey="id"
          tableLayout="fixed"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} nhà cung cấp`,
            itemRender: (pageNumber, type, originalElement) => {
              if (type !== 'page') return originalElement;
              return pageNumber === page ? originalElement : null;
            },
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
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

      <Modal
        title="Import nhà cung cấp từ Excel"
        open={Boolean(importPreview)}
        destroyOnHidden
        onCancel={() => {
          if (isImporting) return;
          setImportPreview(null);
          setImportResultErrors([]);
          setPreviewSearchText('');
        }}
        onOk={handleImportSuppliers}
        confirmLoading={isImporting}
        okButtonProps={{ disabled: !importPreview?.rows.length || isImporting }}
        cancelButtonProps={{ disabled: isImporting }}
        mask={{ closable: !isImporting }}
        okText={isImporting ? 'Đang import...' : 'Tiến hành import'}
        cancelText="Đóng"
        width={860}
      >
        {importPreview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text>
                File <Text strong>{importPreview.fileName}</Text>, sheet đầu tiên{' '}
                <Text strong>{importPreview.sheetName}</Text>:{' '}
                <Text strong className="text-emerald-700">
                  {importPreview.rows.length}
                </Text>{' '}
                dòng hợp lệ sẵn sàng import.
              </Text>
              {importPreview.strategyUsed === 'PATTERN_BASED' && (
                <Tag color="cyan" className="m-0 text-xs">
                  Tự động nhận diện tiền tố dịch vụ
                </Tag>
              )}
            </div>
            <Text type="secondary" className="block text-xs">
              Mỗi dòng được tạo thành một nhà cung cấp. Dữ liệu trống được bỏ qua; cột thành tiền không được import.
            </Text>
            {isImporting && (
              <div className="py-2">
                <Text strong className="text-emerald-700 block mb-1 text-xs">
                  Đang ghi nhận hàng loạt vào cơ sở dữ liệu...
                </Text>
                <Progress percent={100} status="active" showInfo={false} />
              </div>
            )}
            {!!importPreview.errors.length && (
              <Alert
                type="warning"
                showIcon
                message={`${importPreview.errors.length} dòng không hợp lệ sẽ được bỏ qua`}
                description={importPreview.errors.slice(0, 5).join(' · ')}
              />
            )}
            {!!importResultErrors.length && (
              <Alert
                type="error"
                showIcon
                message="Nhập dữ liệu không thành công (Giao dịch đã được hoàn tác)"
                description={(
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {importResultErrors.map((error, idx) => (
                      <div key={idx}>{error}</div>
                    ))}
                  </div>
                )}
              />
            )}

            {/* Quick search input */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Input
                size="small"
                placeholder="Tìm kiếm nhanh trong danh sách xem trước (Mã, Tên, Loại)..."
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                value={previewSearchText}
                onChange={(e) => setPreviewSearchText(e.target.value)}
                allowClear
                className="max-w-xs text-xs"
              />
              {previewSearchText && (
                <Text type="secondary" className="text-xs shrink-0">
                  Tìm thấy {filteredPreviewRows.length} / {importPreview.rows.length} dòng
                </Text>
              )}
            </div>

            <Table
              size="small"
              rowKey="sourceRow"
              dataSource={filteredPreviewRows}
              scroll={{ y: 360 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} của ${total} dòng hợp lệ`,
                size: 'small',
              }}
              columns={[
                {
                  title: 'Dòng',
                  dataIndex: 'sourceRow',
                  key: 'sourceRow',
                  width: 68,
                  align: 'center',
                },
                {
                  title: 'Mã NCC',
                  dataIndex: ['input', 'code'],
                  key: 'code',
                  width: 120,
                  render: (code: string) => <Text strong>{code}</Text>,
                },
                {
                  title: 'Tên nhà cung cấp',
                  dataIndex: ['input', 'name'],
                  key: 'name',
                },
                {
                  title: 'Loại NCC',
                  dataIndex: ['input', 'supplierTypeName'],
                  key: 'type',
                  width: 160,
                  render: (type?: string) =>
                    type ? (
                      <Tag
                        color={getCategoryBadgeColor(type)}
                        className="text-[11px] px-1.5 py-0 border-none font-normal"
                      >
                        {type}
                      </Tag>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">-</span>
                    ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
