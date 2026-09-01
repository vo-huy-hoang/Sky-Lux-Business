'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Popconfirm,
  Result,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileExcelOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { importsService } from '@/services/imports.service';
import { ImportError, ImportRow, ImportSession } from '@/types/import';
import { RowEditModal } from './components/RowEditModal';
import { queryKeys } from '@/lib/query-keys';
import { useImportWizardStore } from '@/lib/stores/import-wizard-store';

const { Title, Text } = Typography;
const { Dragger } = Upload;

function getRawValue(record: ImportRow, key: string) {
  return record.normalizedData?.[key] || record.rawData?.[key] || '-';
}

export default function ImportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentSessionId = useImportWizardStore((state) => state.currentSessionId);
  const setCurrentSessionId = useImportWizardStore((state) => state.setCurrentSessionId);
  const activeTab = useImportWizardStore((state) => state.activeFilterTab);
  const setActiveTab = useImportWizardStore((state) => state.setActiveFilterTab);
  const page = useImportWizardStore((state) => state.page);
  const setPage = useImportWizardStore((state) => state.setPage);
  const pageSize = useImportWizardStore((state) => state.pageSize);
  const setPageSize = useImportWizardStore((state) => state.setPageSize);

  const [editingRow, setEditingRow] = useState<ImportRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);


  const {
    data: session,

    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useQuery<ImportSession>({
    queryKey: queryKeys.imports.sessions({ sessionId: currentSessionId || undefined }),
    queryFn: () => importsService.getSession(currentSessionId!),
    enabled: !!currentSessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'PROCESSING' || data?.status === 'UPLOADED') return 2000;
      return false;
    },
  });

  const {
    data: previewData,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: queryKeys.imports.sessions({ currentSessionId, activeTab, page, pageSize }),
    queryFn: () =>
      importsService.getPreview(currentSessionId!, {
        page,
        limit: pageSize,
        status: activeTab === 'ALL' ? undefined : activeTab,
      }),
    enabled: !!currentSessionId,
  });

  const { data: errorsData } = useQuery({
    queryKey: queryKeys.imports.errors(currentSessionId || undefined),
    queryFn: () => importsService.getErrors(currentSessionId!, { page: 1, limit: 100 }),
    enabled: !!currentSessionId && (session?.errorRows || 0) > 0,
  });


  const uploadMutation = useMutation({
    mutationFn: (file: File) => importsService.upload(file, 'ESTIMATE'),
    onSuccess: (data) => {
      message.success('Tải lên tệp Excel thành công, đang kiểm duyệt dữ liệu...');
      setCurrentSessionId(data.id);
      setPage(1);
      setActiveTab('ALL');
    },
    onError: (err: any) => {
      message.error(err?.message || 'Tải lên tệp thất bại');
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => importsService.validateSession(currentSessionId!),
    onSuccess: () => {
      message.info('Đang chạy lại tiến trình kiểm duyệt...');
      refetchSession();
      refetchPreview();
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể kích hoạt kiểm duyệt');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => importsService.confirm(currentSessionId!),
    onSuccess: (res) => {
      message.success(`Nhập dữ liệu thành công! Đã chuyển ${res.importedRowsCount} hồ sơ vào hệ thống.`);
      queryClient.invalidateQueries({ queryKey: ['import-session', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['import-preview', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Xác nhận nhập dữ liệu thất bại');
    },
  });

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Mã hồ sơ': 'TOUR-2026-001',
        'Tên hồ sơ': 'Tour Du Lịch Đà Nẵng - Hội An 3N2Đ',
        'Mã khách hàng': 'KH001',
        'Tên khách hàng': 'Nguyễn Văn A',
        'Số điện thoại': '0912345678',
        Email: 'customer.a@gmail.com',
        'Ngày sinh nhật': '1990-05-15',
        'Tuyến đường': 'Hà Nội - Đà Nẵng - Hội An',
        'Ngày bắt đầu': '2026-09-01',
        'Ngày kết thúc': '2026-09-03',
        'Mức độ ưu tiên': 'HIGH',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Ho_So');
    XLSX.writeFile(wb, 'SkyLux_Mau_Import_Du_Toan.xlsx');
  };

  const handleRowEdit = (record: ImportRow) => {
    setEditingRow(record);
    setIsEditModalOpen(true);
  };

  const renderStatusTag = (status?: string) => {
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
  };

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
          <Space direction="vertical" size={2}>
            <Text strong>{code || '-'}</Text>
            <Text>{name || '-'}</Text>
            <Text type="secondary" className="text-xs">
              {getRawValue(record, 'route') || record.rawData?.['Tuyến đường'] || '-'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customerInfo',
      render: (_: unknown, record: ImportRow) => (
        <Space direction="vertical" size={2}>
          <Space>
            <UserOutlined className="text-[var(--color-primary-700)]" />
            <Text strong>{getRawValue(record, 'customerName') || record.rawData?.['Tên khách hàng'] || '-'}</Text>
          </Space>
          <Text type="secondary" className="text-xs">
            {[record.normalizedData?.phone || record.rawData?.['Số điện thoại'], record.normalizedData?.email || record.rawData?.Email]
              .filter(Boolean)
              .join(' | ') || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Thời gian',
      key: 'dates',
      width: 160,
      render: (_: unknown, record: ImportRow) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs">Bắt đầu: {record.normalizedData?.startDate || record.rawData?.['Ngày bắt đầu'] || '-'}</Text>
          <Text className="text-xs">Kết thúc: {record.normalizedData?.endDate || record.rawData?.['Ngày kết thúc'] || '-'}</Text>
        </Space>
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
            errorsData?.items?.filter((error: ImportError) => error.rowNumber === record.rowNumber) || [];
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
          onClick={() => handleRowEdit(record)}
          disabled={session?.status === 'CONFIRMED'}
        >
          Sửa
        </Button>
      ),
    },
  ];

  const canConfirm = (session?.errorRows || 0) === 0 && (session?.validRows || 0) > 0;

  return (
    <div className="space-y-5 pb-20">
      <div>
        <Title level={1} className="skylux-page-title">
          Import dự toán Excel
        </Title>
        <div className="skylux-subtitle mt-1">
          Tạo dự toán mới bằng cách import file Excel theo mẫu chuẩn của SkyLux Travel.
        </div>
      </div>

      {!currentSessionId ? (
        <Row gutter={[18, 18]}>
          <Col xs={24} xl={16}>
            <Row gutter={[18, 18]}>
              <Col xs={24} lg={12}>
                <Card className="skylux-card h-full" title="Tải mẫu file dự toán chuẩn">
                  <div className="flex items-center justify-between gap-5">
                    <Space size={16}>
                      <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                        <FileExcelOutlined />
                      </span>
                      <div>
                        <Text strong>Mẫu dự toán SkyLux Travel.xlsx</Text>
                        <div className="mt-1 text-sm text-slate-500">Định dạng chuẩn .xlsx</div>
                      </div>
                    </Space>
                    <Button icon={<DownloadOutlined />} className="skylux-outline-button" onClick={handleDownloadSample}>
                      Tải xuống
                    </Button>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card className="skylux-card h-full" title="Tải lên file dự toán">
                  <Dragger
                    accept=".xlsx, .xls"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(file) => {
                      uploadMutation.mutate(file);
                      return false;
                    }}
                    disabled={uploadMutation.isPending}
                    className="rounded-lg"
                    style={{ padding: '18px 12px', background: '#FFFFFF', borderColor: '#B7D3C7' }}
                  >
                    <p className="ant-upload-drag-icon">
                      {uploadMutation.isPending ? (
                        <Spin size="large" />
                      ) : (
                        <CloudUploadOutlined style={{ fontSize: 40, color: '#003828' }} />
                      )}
                    </p>
                    <p className="ant-upload-text font-semibold">
                      {uploadMutation.isPending ? 'Đang tải lên và xử lý tệp...' : 'Kéo thả file Excel vào đây'}
                    </p>
                    <p className="ant-upload-hint">Chỉ hỗ trợ .xlsx, .xls, tối đa 10MB</p>
                  </Dragger>
                </Card>
              </Col>
            </Row>
          </Col>
          <Col xs={24} xl={8}>
            <Card className="skylux-card h-full" title="Lưu ý kiểm tra dữ liệu">
              <div className="space-y-3 text-sm text-slate-700">
                {[
                  'File phải có định dạng .xlsx hoặc .xls',
                  'Dùng cấu trúc theo mẫu, không thêm hoặc xóa cột',
                  'Dòng tiêu đề nằm ở dòng đầu tiên',
                  'Không để trống mã hồ sơ và tên khách hàng',
                  'Có thể sửa lỗi trực tiếp sau khi tải lên',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircleOutlined className="mt-1 text-[var(--color-primary-600)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Alert
                className="mt-5"
                type="success"
                showIcon
                title="Chỉ những dòng hợp lệ mới được import."
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <div className="space-y-5">
          <Card className="skylux-card" loading={isLoadingSession}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} lg={8}>
                <Space size={16}>
                  <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                    <FileExcelOutlined />
                  </span>
                  <div>
                    <Text strong>Phiên import hiện tại</Text>
                    <div className="mt-1 text-sm text-slate-500">ID: {currentSessionId}</div>
                  </div>
                </Space>
              </Col>
              <Col xs={12} sm={6} lg={4}>
                <Statistic title="Trạng thái" valueRender={() => renderStatusTag(session?.status)} />
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Statistic title="Tổng dòng" value={session?.totalRows || 0} />
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Statistic title="Hợp lệ" value={session?.validRows || 0} styles={{ content: { color: '#007A55' } }} />
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Statistic title="Dòng lỗi" value={session?.errorRows || 0} styles={{ content: { color: session?.errorRows ? '#D93737' : '#6B7280' } }} />
              </Col>
              <Col xs={24} lg={3} className="text-right">
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setCurrentSessionId(null);
                    setActiveTab('ALL');
                  }}
                >
                  File mới
                </Button>
              </Col>
            </Row>
          </Card>

          {(session?.errorRows || 0) > 0 && session?.status !== 'CONFIRMED' && (
            <Alert
              type="warning"
              showIcon
              title="Phiên nhập có dòng dữ liệu lỗi"
              description="Vui lòng sửa các dòng lỗi trong bảng trước khi xác nhận import."
            />
          )}

          {session?.status === 'CONFIRMED' ? (
            <Card className="skylux-card">
              <Result
                status="success"
                title="Nhập dữ liệu thành công"
                subTitle={`Toàn bộ ${session.validRows} hồ sơ và thông tin khách hàng đã được lưu trữ thành công.`}
                extra={[
                  <Button type="primary" className="skylux-primary-button" key="dossiers" onClick={() => router.push('/main/dossiers')}>
                    Xem danh sách hồ sơ
                  </Button>,
                  <Button
                    key="new"
                    onClick={() => {
                      setCurrentSessionId(null);
                      setActiveTab('ALL');
                    }}
                  >
                    Import file khác
                  </Button>,
                ]}
              />
            </Card>
          ) : (
            <Row gutter={[18, 18]}>
              <Col xs={24} xl={18}>
                <Card className="skylux-card">
                  <Tabs
                    activeKey={activeTab}
                    onChange={(key) => {
                      setActiveTab(key as 'ALL' | 'VALID' | 'ERROR');
                      setPage(1);
                    }}
                    items={[
                      { key: 'ALL', label: `Tất cả (${session?.totalRows || 0})` },
                      { key: 'VALID', label: `Hợp lệ (${session?.validRows || 0})` },
                      { key: 'ERROR', label: `Có lỗi (${session?.errorRows || 0})` },
                    ]}
                  />
                  <Table
                    columns={columns}
                    dataSource={previewData?.items || []}
                    rowKey="id"
                    loading={isLoadingPreview || isLoadingSession}
                    className="skylux-table"
                    rowClassName={(record: ImportRow) =>
                      record.status === 'ERROR' ? 'bg-[var(--color-danger-soft)]' : ''
                    }
                    locale={{ emptyText: <Empty description="Chưa có dữ liệu preview từ API" /> }}
                    scroll={{ x: 980 }}
                    pagination={{
                      current: page,
                      pageSize,
                      total: previewData?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50'],
                      onChange: (nextPage, nextPageSize) => {
                        setPage(nextPage);
                        setPageSize(nextPageSize);
                      },
                    }}
                  />
                </Card>
              </Col>
              <Col xs={24} xl={6}>
                <Card className="skylux-card" title={`Lỗi cần xử lý (${session?.errorRows || 0})`}>
                  {errorsData?.items?.length ? (
                    <div className="space-y-4">
                      {errorsData.items.slice(0, 6).map((error: ImportError) => (
                        <div key={`${error.rowNumber}-${error.errorCode}`} className="border-b border-[var(--color-divider)] pb-4 last:border-b-0">
                          <Space align="start">
                            <CloseCircleOutlined className="mt-1 text-[var(--color-danger)]" />
                            <div>
                              <Text strong>Dòng {error.rowNumber} - {error.columnName || error.errorCode}</Text>
                              <div className="mt-1 text-sm text-slate-500">{error.errorMessage}</div>
                            </div>
                          </Space>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty description="Chưa có lỗi từ API" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>
                <Card className="skylux-card mt-5" title="Ghi chú của điều hành">
                  <div className="min-h-[150px] rounded-lg border border-[var(--color-border)] bg-[#F9FAFA] p-4 text-sm text-slate-400">
                    Chưa có ghi chú nào.
                  </div>
                </Card>
              </Col>
            </Row>
          )}
        </div>
      )}

      {currentSessionId && session?.status !== 'CONFIRMED' && (
        <div className="fixed bottom-0 left-[228px] right-0 z-20 border-t border-[var(--color-border)] bg-white px-7 py-4 shadow-[0_-10px_30px_rgb(16_24_40/0.06)] max-lg:left-[72px]">
          <div className="mx-auto flex max-w-[1540px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Space className="text-sm text-slate-500">
              <InfoCircleOutlined className="text-[var(--color-primary-600)]" />
              <span>Tự động lưu trạng thái kiểm tra theo phiên import</span>
            </Space>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => validateMutation.mutate()}
                loading={validateMutation.isPending || session?.status === 'PROCESSING'}
              >
                Kiểm tra file
              </Button>
              <Popconfirm
                title="Xác nhận import chính thức"
                description={`Bạn có chắc chắn muốn nhập ${session?.validRows || 0} dòng hợp lệ vào cơ sở dữ liệu?`}
                onConfirm={() => confirmMutation.mutate()}
                disabled={!canConfirm}
                okText="Xác nhận"
                cancelText="Hủy"
              >
                <Button
                  icon={<RocketOutlined />}
                  loading={confirmMutation.isPending}
                  disabled={!canConfirm}
                  className="skylux-primary-button"
                >
                  Xác nhận import
                </Button>
              </Popconfirm>
            </Space>
          </div>
        </div>
      )}

      <RowEditModal
        visible={isEditModalOpen}
        sessionId={currentSessionId || ''}
        row={editingRow}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRow(null);
        }}
        onSuccess={() => {
          refetchSession();
          refetchPreview();
        }}
      />
    </div>
  );
}
