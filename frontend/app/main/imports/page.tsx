'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Typography,
  Upload,
  Button,
  Table,
  Tag,
  Space,
  Alert,
  Tabs,
  Popconfirm,
  message,
  Statistic,
  Row,
  Col,
  Result,
  Spin,
  Tooltip,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EditOutlined,
  FileExcelOutlined,
  RocketOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { importsService } from '@/services/imports.service';
import { ImportSession, ImportRow, ImportError } from '@/types/import';
import { RowEditModal } from './components/RowEditModal';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function ImportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingRow, setEditingRow] = useState<ImportRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 1. Fetch Session Status (API-IMPORT-002)
  const {
    data: session,
    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useQuery<ImportSession>({
    queryKey: ['import-session', currentSessionId],
    queryFn: () => importsService.getSession(currentSessionId!),
    enabled: !!currentSessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'PROCESSING' || data?.status === 'UPLOADED') {
        return 2000;
      }
      return false;
    },
  });

  // 2. Fetch Preview Rows (API-IMPORT-003)
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ['import-preview', currentSessionId, activeTab, page, pageSize],
    queryFn: () =>
      importsService.getPreview(currentSessionId!, {
        page,
        limit: pageSize,
        status: activeTab === 'ALL' ? undefined : activeTab,
      }),
    enabled: !!currentSessionId,
  });

  // 3. Fetch Errors (API-IMPORT-004)
  const { data: errorsData } = useQuery({
    queryKey: ['import-errors', currentSessionId],
    queryFn: () =>
      importsService.getErrors(currentSessionId!, { page: 1, limit: 100 }),
    enabled: !!currentSessionId && (session?.errorRows || 0) > 0,
  });

  // 4. Mutation Upload File (API-IMPORT-001)
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

  // 5. Mutation Validate Session (API-IMPORT-006)
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

  // 6. Mutation Confirm Import (API-IMPORT-007)
  const confirmMutation = useMutation({
    mutationFn: () => importsService.confirm(currentSessionId!),
    onSuccess: (res) => {
      message.success(
        `Nhập dữ liệu thành công! Đã chuyển ${res.importedRowsCount} hồ sơ vào hệ thống.`,
      );
      queryClient.invalidateQueries({ queryKey: ['import-session', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['import-preview', currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Xác nhận nhập dữ liệu thất bại');
    },
  });

  // Tải file mẫu Excel
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Mã hồ sơ': 'TOUR-2026-001',
        'Tên hồ sơ': 'Tour Du Lịch Đà Nẵng - Hội An 3N2Đ',
        'Mã khách hàng': 'KH001',
        'Tên khách hàng': 'Nguyễn Văn A',
        'Số điện thoại': '0912345678',
        'Email': 'customer.a@gmail.com',
        'Ngày sinh nhật': '1990-05-15',
        'Tuyến đường': 'Hà Nội - Đà Nẵng - Hội An',
        'Ngày bắt đầu': '2026-09-01',
        'Ngày kết thúc': '2026-09-03',
        'Mức độ ưu tiên': 'HIGH',
      },
      {
        'Mã hồ sơ': 'TOUR-2026-002',
        'Tên hồ sơ': 'Tour Nghỉ Dưỡng Nha Trang 4N3Đ',
        'Mã khách hàng': 'KH002',
        'Tên khách hàng': 'Trần Thị B',
        'Số điện thoại': '0987654321',
        'Email': 'customer.b@gmail.com',
        'Ngày sinh nhật': '1995-10-20',
        'Tuyến đường': 'TP.HCM - Nha Trang',
        'Ngày bắt đầu': '2026-09-10',
        'Ngày kết thúc': '2026-09-13',
        'Mức độ ưu tiên': 'MEDIUM',
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

  const columns = [
    {
      title: 'Dòng',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 70,
      render: (num: number) => <Text strong>#{num}</Text>,
    },
    {
      title: 'Thông tin Hồ sơ',
      key: 'dossierInfo',
      render: (_: any, record: ImportRow) => {
        const raw = record.rawData || {};
        const norm = record.normalizedData || {};
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <Text strong>{norm.code || raw['Mã hồ sơ'] || '—'}</Text>
              <Tag color={norm.priority === 'HIGH' ? 'red' : 'blue'}>
                {norm.priority || raw['Mức độ ưu tiên'] || 'MEDIUM'}
              </Tag>
            </Space>
            <Text style={{ fontSize: 13 }}>
              {norm.name || raw['Tên hồ sơ'] || '—'}
            </Text>
            {(norm.route || raw['Tuyến đường']) && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tuyến: {norm.route || raw['Tuyến đường']}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Khách hàng liên kết',
      key: 'customerInfo',
      render: (_: any, record: ImportRow) => {
        const raw = record.rawData || {};
        const norm = record.normalizedData || {};
        const custName = norm.customerName || raw['Tên khách hàng'];
        const phone = norm.phone || raw['Số điện thoại'] || raw['Số ĐT'];
        const email = norm.email || raw['Email'];
        const dob = norm.dateOfBirth || raw['Ngày sinh nhật'] || raw['Ngày sinh'];

        return (
          <Space direction="vertical" size={2}>
            <Space>
              <UserOutlined />
              <Tag color="geekblue">{raw['Mã khách hàng'] || '—'}</Tag>
              {custName && <Text strong>{custName}</Text>}
            </Space>
            {(phone || email) && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {[phone, email].filter(Boolean).join(' • ')}
              </Text>
            )}
            {dob && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CalendarOutlined /> Sinh nhật: {dob}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Thời gian',
      key: 'dates',
      width: 150,
      render: (_: any, record: ImportRow) => {
        const raw = record.rawData || {};
        const norm = record.normalizedData || {};
        const start = norm.startDate || raw['Ngày bắt đầu'];
        const end = norm.endDate || raw['Ngày kết thúc'];

        if (!start && !end) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
            <div>Bắt đầu: {start || '—'}</div>
            <div>Kết thúc: {end || '—'}</div>
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (st: string, record: ImportRow) => {
        if (st === 'VALID') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Hợp lệ
            </Tag>
          );
        }
        if (st === 'ERROR') {
          const rowErrors =
            errorsData?.items?.filter((e: ImportError) => e.rowNumber === record.rowNumber) || [];
          return (
            <Tooltip
              title={
                rowErrors.length > 0
                  ? rowErrors.map((e: ImportError) => e.errorMessage).join('; ')
                  : 'Dữ liệu không hợp lệ'
              }
            >
              <Tag icon={<CloseCircleOutlined />} color="error">
                Có lỗi ({rowErrors.length || 1})
              </Tag>
            </Tooltip>
          );
        }
        if (st === 'IMPORTED') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="blue">
              Đã Import
            </Tag>
          );
        }
        return <Tag color="default">Chờ duyệt</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, record: ImportRow) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleRowEdit(record)}
          disabled={session?.status === 'CONFIRMED'}
        >
          Sửa
        </Button>
      ),
    },
  ];

  const renderStatusTag = (st?: string) => {
    switch (st) {
      case 'PROCESSING':
        return (
          <Tag icon={<SyncOutlined spin />} color="processing">
            Đang xử lý & kiểm duyệt...
          </Tag>
        );
      case 'READY_FOR_REVIEW':
        return <Tag color="warning">Sẵn sàng kiểm duyệt</Tag>;
      case 'CONFIRMED':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Đã nhập dữ liệu thành công
          </Tag>
        );
      case 'FAILED':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Thất bại
          </Tag>
        );
      default:
        return <Tag color="default">{st || 'Chưa khởi tạo'}</Tag>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <FileExcelOutlined /> Import Excel Hồ Sơ & Dự Toán Tour
            </Title>
            <Text type="secondary">
              Tải lên file Excel dự toán, tự động kiểm duyệt lỗi, chuẩn hóa thông tin khách hàng và đẩy vào hệ thống.
            </Text>
          </div>

          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadSample}
            >
              Tải file Excel mẫu (.xlsx)
            </Button>
            {currentSessionId && (
              <Button
                onClick={() => {
                  setCurrentSessionId(null);
                  setActiveTab('ALL');
                }}
              >
                Nhập file mới
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {!currentSessionId ? (
        /* Bước 1: Upload File */
        <Card title="Bước 1: Tải lên tệp dữ liệu Excel">
          <Dragger
            accept=".xlsx, .xls"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              uploadMutation.mutate(file);
              return false;
            }}
            disabled={uploadMutation.isPending}
            style={{ padding: '30px 20px', background: '#fafafa' }}
          >
            <p className="ant-upload-drag-icon">
              {uploadMutation.isPending ? (
                <Spin size="large" />
              ) : (
                <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              )}
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
              {uploadMutation.isPending
                ? 'Đang tải lên và xử lý tệp...'
                : 'Nhấp hoặc kéo thả file Excel vào khu vực này để import'}
            </p>
            <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
              Hỗ trợ định dạng .xlsx, .xls (dung lượng tối đa 10MB). Các trường thông tin hỗ trợ: Mã hồ sơ, Tên hồ sơ, Mã khách hàng, Tên khách hàng, Số điện thoại, Email, Ngày sinh nhật, Tuyến đường, Thời gian, Mức độ ưu tiên.
            </p>
          </Dragger>

          <Alert
            message="Lưu ý khi nhập dữ liệu:"
            description={
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>Hệ thống sẽ tự động xác minh xem <strong>Mã khách hàng</strong> đã tồn tại chưa.</li>
                <li>Nếu cung cấp thêm <strong>Tên, Số điện thoại, Email, Ngày sinh nhật</strong>, hệ thống sẽ tự động cập nhật thông tin khách hàng tương ứng.</li>
                <li>Bạn có thể sửa lỗi trực tiếp trên giao diện bảng tạm trước khi nhấn xác nhận import.</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginTop: 20 }}
          />
        </Card>
      ) : (
        /* Bước 2 & 3: Kiểm duyệt và Xác nhận Import */
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Thống kê phiên import */}
          <Card loading={isLoadingSession}>
            <Row gutter={16} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Trạng thái phiên"
                  valueRender={() => renderStatusTag(session?.status)}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Statistic
                  title="Tổng số dòng"
                  value={session?.totalRows || 0}
                  prefix={<FileExcelOutlined />}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Statistic
                  title="Hợp lệ"
                  value={session?.validRows || 0}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Statistic
                  title="Có lỗi"
                  value={session?.errorRows || 0}
                  valueStyle={{ color: session?.errorRows ? '#f5222d' : '#8c8c8c' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={6} style={{ textAlign: 'right' }}>
                <Space wrap>
                  <Button
                    icon={<SyncOutlined />}
                    onClick={() => validateMutation.mutate()}
                    loading={validateMutation.isPending || session?.status === 'PROCESSING'}
                    disabled={session?.status === 'CONFIRMED'}
                  >
                    Kiểm duyệt lại
                  </Button>

                  {session?.status !== 'CONFIRMED' ? (
                    <Popconfirm
                      title="Xác nhận import chính thức"
                      description={`Bạn có chắc chắn muốn nhập ${session?.validRows || 0} dòng hợp lệ vào cơ sở dữ liệu?`}
                      onConfirm={() => confirmMutation.mutate()}
                      disabled={(session?.errorRows || 0) > 0 || (session?.validRows || 0) === 0}
                      okText="Xác nhận"
                      cancelText="Hủy"
                    >
                      <Button
                        type="primary"
                        icon={<RocketOutlined />}
                        loading={confirmMutation.isPending}
                        disabled={(session?.errorRows || 0) > 0 || (session?.validRows || 0) === 0}
                      >
                        Xác nhận Import
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Tag color="success" style={{ padding: '6px 12px', fontSize: 14 }}>
                      ✓ Đã hoàn tất nhập dữ liệu
                    </Tag>
                  )}
                </Space>
              </Col>
            </Row>

            {(session?.errorRows || 0) > 0 && session?.status !== 'CONFIRMED' && (
              <Alert
                message="Phiên nhập có dòng dữ liệu lỗi!"
                description="Vui lòng nhấn nút 'Sửa' tại các dòng bị lỗi trong bảng bên dưới hoặc sửa lại file Excel và tải lên lại trước khi có thể xác nhận Import."
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {session?.status === 'CONFIRMED' && (
              <Result
                status="success"
                title="Nhập dữ liệu thành công!"
                subTitle={`Toàn bộ ${session.validRows} hồ sơ và thông tin khách hàng đã được lưu trữ thành công.`}
                style={{ padding: '20px 0' }}
                extra={[
                  <Button
                    type="primary"
                    key="dossiers"
                    onClick={() => router.push('/main/dossiers')}
                  >
                    Xem danh sách Hồ sơ
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
            )}
          </Card>

          {/* Bảng xem trước dữ liệu (Preview) */}
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key as any);
                  setPage(1);
                }}
                items={[
                  {
                    key: 'ALL',
                    label: `Tất cả (${session?.totalRows || 0})`,
                  },
                  {
                    key: 'VALID',
                    label: `Hợp lệ (${session?.validRows || 0})`,
                  },
                  {
                    key: 'ERROR',
                    label: `Có lỗi (${session?.errorRows || 0})`,
                  },
                ]}
              />
            </div>

            <Table
              columns={columns}
              dataSource={previewData?.items || []}
              rowKey="id"
              loading={isLoadingPreview || isLoadingSession}
              pagination={{
                current: page,
                pageSize,
                total: previewData?.total || 0,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
              }}
            />
          </Card>
        </Space>
      )}

      {/* Modal sửa dòng lỗi */}
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
