'use client';

import React from 'react';
import { Col, Row, Typography } from 'antd';
import { useImportFlow } from './hooks/useImportFlow';
import {
  ImportConfirmedResult,
  ImportErrorSidebar,
  ImportFloatingActionBar,
  ImportPreviewTable,
  ImportSessionHeader,
  ImportUploadZone,
  RowEditModal,
} from './components';

const { Title } = Typography;

const DEFAULT_PREVIEW_ROWS: PreviewRowItem[] = [
  {
    stt: 1,
    category: 'Vé máy bay khứ hồi',
    quantity: 2,
    unit: 'Vé',
    unitPrice: '12.500.000',
    vatRate: 8,
    totalAmount: '27.000.000',
    status: 'VALID',
  },
  {
    stt: 2,
    category: 'Khách sạn 4 sao (3 đêm)',
    quantity: 2,
    unit: 'Phòng',
    unitPrice: '3.200.000',
    vatRate: 10,
    totalAmount: '7.040.000',
    status: 'VALID',
  },
  {
    stt: 3,
    category: 'Ăn uống',
    quantity: 2,
    unit: 'Khách',
    unitPrice: '800.000',
    vatRate: 5,
    totalAmount: '1.680.000',
    status: 'VALID',
  },
  {
    stt: 4,
    category: 'Xe đưa đón sân bay',
    quantity: 1,
    unit: 'Xe',
    unitPrice: '1.200.000',
    vatRate: 10,
    totalAmount: '1.320.000',
    status: 'VALID',
  },
  {
    stt: 5,
    category: 'HDV tiếng Anh',
    quantity: 1,
    unit: 'Ngày',
    unitPrice: '1.500.000',
    vatRate: 10,
    totalAmount: '1.650.000',
    status: 'VALID',
  },
  {
    stt: 6,
    category: 'Bảo hiểm du lịch',
    quantity: 2,
    unit: 'Khách',
    unitPrice: 'abc',
    vatRate: 10,
    totalAmount: 'abc',
    status: 'ERROR',
    errorMessage: 'Đơn giá không hợp lệ',
  },
  {
    stt: 7,
    category: 'Phí visa',
    quantity: 2,
    unit: 'Khách',
    unitPrice: '500.000',
    vatRate: 'abc',
    totalAmount: '1.100.000',
    status: 'ERROR',
    errorMessage: 'VAT không hợp lệ',
  },
  {
    stt: 8,
    category: 'Sim 4G',
    quantity: 2,
    unit: 'Sim',
    unitPrice: '200.000',
    vatRate: 10,
    totalAmount: '-',
    status: 'ERROR',
    errorMessage: 'Thiếu Thành tiền',
  },
  {
    stt: 9,
    category: 'Tip HDV',
    quantity: 1,
    unit: 'Gói',
    unitPrice: '300.000',
    vatRate: 10,
    totalAmount: '330.000',
    status: 'VALID',
  },
  {
    stt: 10,
    category: 'Quà tặng',
    quantity: 2,
    unit: 'Phần',
    unitPrice: '150.000',
    vatRate: 10,
    totalAmount: '330.000',
    status: 'VALID',
  },
  // Additional rows for 28 rows total
  ...Array.from({ length: 18 }, (_, i) => ({
    stt: i + 11,
    category: `Dịch vụ bổ sung #${i + 1}`,
    quantity: 2,
    unit: 'Gói',
    unitPrice: '500.000',
    vatRate: 10,
    totalAmount: '1.100.000',
    status: 'VALID' as const,
  })),
];

export default function ImportsPage() {
  const flow = useImportFlow();

  const handleResetSession = () => {
    flow.setCurrentSessionId(null);
    flow.setActiveTab('ALL');
  };

  return (
    <div className="space-y-4 pb-28">
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file);
        }}
      />

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5">
          Import dự toán Excel
        </h1>
        <p className="text-xs text-slate-500 mb-0">
          Tạo dự toán mới bằng cách import file Excel theo mẫu chuẩn của SkyLux Travel.
        </p>
      </div>

      {/* Top 3 Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Col (Span 8): Sections 1 & 2 */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 1. Tải mẫu file dự toán chuẩn */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-2 bg-white flex flex-col justify-between">
            <h2 className="text-xs font-bold text-slate-900 mb-3">
              1. Tải mẫu file dự toán chuẩn
            </h2>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <FileExcelFilled className="text-2xl text-emerald-600" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    Mẫu dự toán SkyLux Travel.xlsx
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Định dạng chuẩn (.xlsx) • Cập nhật 20/05/2025
                  </span>
                </div>
              </div>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadSample}
                className="h-8 rounded-lg border-emerald-600 text-emerald-700 font-medium text-xs px-3 hover:bg-emerald-50"
              >
                Tải xuống
              </Button>
            </div>
          </Card>

          {/* Card 2: 2. Tải lên file dự toán */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-2 bg-white">
            <h2 className="text-xs font-bold text-slate-900 mb-2">
              2. Tải lên file dự toán
            </h2>
            <Dragger
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={(file) => {
                handleProcessFile(file);
                return false;
              }}
              className="rounded-xl border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 py-3"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <CloudUploadOutlined className="text-3xl text-slate-700 mb-1" />
                <span className="text-xs font-semibold text-slate-800">
                  Kéo & thả file Excel vào đây
                </span>
                <span className="text-[11px] text-slate-400 my-1">hoặc</span>
                <Button
                  size="small"
                  className="rounded-lg border-slate-300 text-slate-700 font-medium text-xs h-7 px-3 bg-white"
                >
                  Chọn file từ máy tính
                </Button>
                <span className="text-[10px] text-slate-400 mt-2">
                  Chỉ hỗ trợ file .xlsx, tối đa 20MB
                </span>
              </div>
            </Dragger>
          </Card>
        </div>

        {/* Right Col (Span 4): Lưu ý kiểm tra dữ liệu */}
        <div className="lg:col-span-4">
          <Card className="rounded-2xl border-slate-100 shadow-sm p-2 bg-white h-full flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 mb-2.5">
                Lưu ý kiểm tra dữ liệu
              </h2>
              <ul className="space-y-1.5 text-xs text-slate-600 mb-3 pl-0 list-none">
                {[
                  'File phải có định dạng .xlsx',
                  'Đúng cấu trúc theo mẫu (không thêm/xóa cột)',
                  'Dòng tiêu đề ở dòng đầu tiên',
                  'SL, Đơn giá, VAT phải là số',
                  'Đơn giá, Thành tiền phải là số dương',
                  'VAT nhập theo % (ví dụ: 10 cho 10%)',
                  'Không để trống Hạng mục và Đơn vị',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-[11px]">
                    <CheckCircleFilled className="text-emerald-500 text-xs shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notification alert */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 flex items-start gap-2 text-emerald-800 text-[11px]">
              <InfoCircleOutlined className="text-emerald-600 text-xs mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">Chỉ những dòng hợp lệ mới được import.</span>
                <span className="text-emerald-700">Các dòng lỗi sẽ được hiển thị để bạn kiểm tra.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {!flow.currentSessionId ? (
        <ImportUploadZone
          onDownloadSample={flow.handleDownloadSample}
          onUploadFile={(file) => flow.uploadMutation.mutate(file)}
          isUploading={flow.uploadMutation.isPending}
        />
      ) : (
        <div className="space-y-5">
          <ImportSessionHeader
            currentSessionId={flow.currentSessionId}
            session={flow.session}
            isLoadingSession={flow.isLoadingSession}
            onResetSession={handleResetSession}
          />

          {flow.session?.status === 'CONFIRMED' ? (
            <ImportConfirmedResult
              session={flow.session}
              onResetSession={handleResetSession}
            />
          ) : (
            <Row gutter={[18, 18]}>
              <Col xs={24} xl={18}>
                <ImportPreviewTable
                  session={flow.session}
                  previewData={flow.previewData}
                  errorsData={flow.errorsData}
                  isLoading={flow.isLoadingPreview || flow.isLoadingSession}
                  activeTab={flow.activeTab}
                  onTabChange={(tab) => {
                    flow.setActiveTab(tab);
                    flow.setPage(1);
                  }}
                  page={flow.page}
                  pageSize={flow.pageSize}
                  onPageChange={(nextPage, nextPageSize) => {
                    flow.setPage(nextPage);
                    flow.setPageSize(nextPageSize);
                  }}
                  onRowEdit={flow.handleRowEdit}
                />
              </Col>
              <Col xs={24} xl={6}>
                <ImportErrorSidebar
                  session={flow.session}
                  errorsData={flow.errorsData}
                />
              </Col>
            </Row>
          )}
        </div>
      )}

      {flow.currentSessionId && flow.session?.status !== 'CONFIRMED' && (
        <ImportFloatingActionBar
          session={flow.session}
          isValidating={flow.validateMutation.isPending}
          isConfirming={flow.confirmMutation.isPending}
          canConfirm={flow.canConfirm}
          onValidate={() => flow.validateMutation.mutate()}
          onConfirm={() => flow.confirmMutation.mutate()}
        />
      )}

      <RowEditModal
        visible={flow.isEditModalOpen}
        sessionId={flow.currentSessionId || ''}
        row={flow.editingRow}
        onClose={() => {
          flow.setIsEditModalOpen(false);
          flow.setEditingRow(null);
        }}
        onSuccess={() => {
          flow.refetchSession();
          flow.refetchPreview();
        }}
      />
    </div>
  );
}
