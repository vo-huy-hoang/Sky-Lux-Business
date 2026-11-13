'use client';

import React, { useRef, useState } from 'react';
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


const { Title, Text } = Typography;
const { Option } = Select;

interface SupplierImportRow {
  sourceRow: number;
  input: CreateSupplierInput;
}

interface SupplierImportPreview {
  fileName: string;
  sheetName: string;
  rows: SupplierImportRow[];
  errors: string[];
}

const normalizeExcelHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const excelCellText = (value: unknown) =>
  value === null || value === undefined ? '' : String(value).trim();

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
  const [importPreview, setImportPreview] = useState<SupplierImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResultErrors, setImportResultErrors] = useState<string[]>([]);

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
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        message.error('File Excel không có sheet nào để nhập');
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: '',
        raw: false,
      });
      const headerRowIndex = matrix.findIndex((row) => {
        const normalized = row.map(normalizeExcelHeader);
        return (
          normalized.some((value) => ['ma ncc', 'ma nha cung cap', 'code'].includes(value)) &&
          normalized.some((value) => ['ten nha cung cap', 'ten ncc', 'name'].includes(value))
        );
      });

      if (headerRowIndex < 0) {
        message.error('Không tìm thấy dòng tiêu đề có cột Mã NCC và Tên nhà cung cấp');
        return;
      }

      const headers = matrix[headerRowIndex].map(normalizeExcelHeader);
      const findColumn = (aliases: string[]) =>
        headers.findIndex((header) => aliases.includes(header));
      const codeColumn = findColumn(['ma ncc', 'ma nha cung cap', 'code']);
      const nameColumn = findColumn(['ten nha cung cap', 'ten ncc', 'name']);
      const typeColumn = findColumn(['loai ncc', 'loai nha cung cap', 'supplier type']);
      const contactColumn = findColumn(['nguoi lien he', 'contact name', 'contact']);
      const taxCodeColumn = findColumn(['ma so thue', 'tax code', 'tax id']);
      const phoneColumn = findColumn(['dien thoai', 'so dien thoai', 'phone']);
      const emailColumn = findColumn(['email', 'thu dien tu']);
      const addressColumn = findColumn(['dia chi', 'address']);
      const paymentTermsColumn = findColumn(['dieu khoan thanh toan', 'payment terms']);

      const rows: SupplierImportRow[] = [];
      const errors: string[] = [];
      const seenCodes = new Set<string>();
      matrix.slice(headerRowIndex + 1).forEach((row, index) => {
        const sourceRow = headerRowIndex + index + 2;
        const code = excelCellText(row[codeColumn]);
        const name = excelCellText(row[nameColumn]);
        if (!code && !name) return;
        if (!code || !name) {
          errors.push(`Dòng ${sourceRow}: thiếu ${!code ? 'Mã NCC' : 'Tên nhà cung cấp'}`);
          return;
        }
        const normalizedCode = code.toLocaleLowerCase();
        if (seenCodes.has(normalizedCode)) {
          errors.push(`Dòng ${sourceRow}: mã NCC "${code}" bị lặp trong file`);
          return;
        }
        seenCodes.add(normalizedCode);

        const optionalValue = (column: number) =>
          column < 0 ? undefined : excelCellText(row[column]) || undefined;
        rows.push({
          sourceRow,
          input: {
            code,
            name,
            supplierTypeName: optionalValue(typeColumn),
            contactName: optionalValue(contactColumn),
            taxCode: optionalValue(taxCodeColumn),
            phone: optionalValue(phoneColumn),
            email: optionalValue(emailColumn),
            address: optionalValue(addressColumn),
            paymentTerms: optionalValue(paymentTermsColumn),
          },
        });
      });

      if (rows.length === 0) {
        message.error(errors[0] || 'Sheet đầu tiên không có dòng nhà cung cấp hợp lệ');
        return;
      }
      setImportResultErrors([]);
      setImportPreview({ fileName: file.name, sheetName, rows, errors });
    } catch {
      message.error('Không đọc được file Excel. Vui lòng chọn file .xlsx hoặc .xls hợp lệ.');
    }
  };

  const handleImportSuppliers = async () => {
    if (!importPreview || isImporting) return;
    setIsImporting(true);
    const failedRows: SupplierImportRow[] = [];
    const errors: string[] = [];
    let importedCount = 0;

    for (const row of importPreview.rows) {
      try {
        await suppliersService.createSupplier(row.input);
        importedCount += 1;
      } catch (error: any) {
        failedRows.push(row);
        const reason =
          error?.response?.data?.message ||
          error?.message ||
          'Không thể tạo nhà cung cấp';
        errors.push(`Dòng ${row.sourceRow} (${row.input.code}): ${reason}`);
      }
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    setIsImporting(false);
    setImportResultErrors(errors);
    if (errors.length === 0) {
      message.success(`Đã nhập ${importedCount} nhà cung cấp`);
      setImportPreview(null);
      return;
    }
    setImportPreview({ ...importPreview, rows: failedRows });
    if (importedCount > 0) {
      message.warning(`Đã nhập ${importedCount}; còn ${failedRows.length} dòng cần xử lý`);
    } else {
      message.error(`Chưa nhập được dữ liệu; ${failedRows.length} dòng gặp lỗi`);
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
        onCancel={() => {
          if (isImporting) return;
          setImportPreview(null);
          setImportResultErrors([]);
        }}
        onOk={handleImportSuppliers}
        confirmLoading={isImporting}
        okButtonProps={{ disabled: !importPreview?.rows.length || isImporting }}
        cancelButtonProps={{ disabled: isImporting }}
        mask={{ closable: !isImporting }}
        okText={importResultErrors.length ? 'Thử nhập lại dòng lỗi' : 'Import nhà cung cấp'}
        cancelText="Đóng"
        width={760}
      >
        {importPreview && (
          <div className="space-y-3">
            <Text>
              File <Text strong>{importPreview.fileName}</Text>, sheet đầu tiên{' '}
              <Text strong>{importPreview.sheetName}</Text>: {importPreview.rows.length}{' '}
              {importResultErrors.length ? 'dòng còn lại cần xử lý' : 'dòng hợp lệ'}.
            </Text>
            <Text type="secondary" className="block">
              Mỗi dòng được tạo thành một nhà cung cấp. Dữ liệu trống được bỏ qua; cột thành tiền không được import.
            </Text>
            {!!importPreview.errors.length && (
              <Alert
                type="warning"
                showIcon
                title={`${importPreview.errors.length} dòng không hợp lệ sẽ được bỏ qua`}
                description={importPreview.errors.slice(0, 5).join(' · ')}
              />
            )}
            {!!importResultErrors.length && (
              <Alert
                type="error"
                showIcon
                title={`${importResultErrors.length} dòng chưa import được`}
                description={(
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {importResultErrors.map((error) => <div key={error}>{error}</div>)}
                  </div>
                )}
              />
            )}
            <Table
              size="small"
              pagination={false}
              rowKey="sourceRow"
              dataSource={importPreview.rows.slice(0, 8)}
              columns={[
                { title: 'Dòng', dataIndex: 'sourceRow', key: 'sourceRow', width: 64 },
                { title: 'Mã NCC', dataIndex: ['input', 'code'], key: 'code', width: 110 },
                { title: 'Tên nhà cung cấp', dataIndex: ['input', 'name'], key: 'name' },
                { title: 'Loại NCC', dataIndex: ['input', 'supplierTypeName'], key: 'type', width: 150 },
              ]}
            />
            {importPreview.rows.length > 8 && (
              <Text type="secondary">Đang xem trước 8 dòng đầu tiên.</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
