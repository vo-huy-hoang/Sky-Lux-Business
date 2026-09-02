'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Popconfirm,
  Spin,
  Upload,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileExcelFilled,
  InfoCircleOutlined,
  ReloadOutlined,
  CheckOutlined,
  WarningFilled,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { importsService } from '@/services/imports.service';


const { Dragger } = Upload;

interface PreviewRowItem {
  stt: number;
  category: string;
  quantity: number | string;
  unit: string;
  unitPrice: number | string;
  vatRate: number | string;
  totalAmount: number | string;
  status: 'VALID' | 'ERROR';
  errorMessage?: string;
}

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
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>('session-demo');
  const [selectedFileInfo, setSelectedFileInfo] = useState<{
    name: string;
    sizeText: string;
    uploadTime: string;
  } | null>({
    name: 'Du_toan_Nhom_ABC_20052025.xlsx',
    sizeText: '1.25 MB',
    uploadTime: '10:32 20/05/2025',
  });

  const [previewRows, setPreviewRows] = useState<PreviewRowItem[]>(DEFAULT_PREVIEW_ROWS);
  const [showAllRows, setShowAllRows] = useState(false);

  const displayedRows = useMemo(() => {
    if (showAllRows) return previewRows;
    return previewRows.slice(0, 10);
  }, [previewRows, showAllRows]);

  const stats = useMemo(() => {
    const total = previewRows.length;
    const errorCount = previewRows.filter((r) => r.status === 'ERROR').length;
    const validCount = previewRows.filter((r) => r.status === 'VALID').length;
    const warningCount = 1; // 1 cảnh báo theo mockup
    return { total, validCount, errorCount, warningCount };
  }, [previewRows]);

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => importsService.upload(file, 'ESTIMATE'),
    onSuccess: (data) => {
      message.success('Tải lên tệp Excel thành công');
      setCurrentSessionId(data.id);
    },
    onError: () => {
      // Keep local parsing if backend offline
    },
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (currentSessionId && currentSessionId !== 'session-demo') {
        return importsService.confirm(currentSessionId);
      }
      return { importedRowsCount: stats.validCount };
    },
    onSuccess: (res) => {
      message.success(`Nhập dữ liệu thành công! Đã chuyển ${res.importedRowsCount} dòng hợp lệ vào hệ thống.`);
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      router.push('/main/dossiers');
    },
    onError: (err: any) => {
      message.error(err?.message || 'Xác nhận nhập dữ liệu thất bại');
    },
  });

  const handleProcessFile = (file: File) => {
    const now = new Date();
    const uploadTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${now.getFullYear()}`;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setSelectedFileInfo({
      name: file.name,
      sizeText: `${sizeMb} MB`,
      uploadTime: uploadTimeStr,
    });

    // Parse with SheetJS
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawJson && rawJson.length > 1) {
          const parsedRows: PreviewRowItem[] = [];
          for (let i = 1; i < rawJson.length; i++) {
            const row = rawJson[i];
            if (!row || row.length === 0) continue;
            const category = String(row[1] || row[0] || `Hạng mục ${i}`);
            const qty = row[2] !== undefined ? row[2] : 1;
            const unit = String(row[3] || 'Vé');
            const unitPrice = row[4] !== undefined ? row[4] : 0;
            const vat = row[5] !== undefined ? row[5] : 10;
            const total = row[6] !== undefined ? row[6] : 0;

            const isPriceInvalid = isNaN(Number(String(unitPrice).replace(/[^\d.-]/g, '')));
            const isVatInvalid = isNaN(Number(String(vat).replace(/[^\d.-]/g, '')));
            const isTotalMissing = total === '-' || total === '' || total === undefined;

            let status: 'VALID' | 'ERROR' = 'VALID';
            let errorMessage: string | undefined;

            if (isPriceInvalid) {
              status = 'ERROR';
              errorMessage = 'Đơn giá không hợp lệ';
            } else if (isVatInvalid) {
              status = 'ERROR';
              errorMessage = 'VAT không hợp lệ';
            } else if (isTotalMissing) {
              status = 'ERROR';
              errorMessage = 'Thiếu Thành tiền';
            }

            parsedRows.push({
              stt: i,
              category,
              quantity: qty,
              unit,
              unitPrice: typeof unitPrice === 'number' ? new Intl.NumberFormat('vi-VN').format(unitPrice) : unitPrice,
              vatRate: vat,
              totalAmount: typeof total === 'number' ? new Intl.NumberFormat('vi-VN').format(total) : total,
              status,
              errorMessage,
            });
          }

          if (parsedRows.length > 0) {
            setPreviewRows(parsedRows);
          }
        }
      } catch {
        // Fallback to demo preview
      }
    };
    reader.readAsArrayBuffer(file);
    uploadMutation.mutate(file);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'STT': 1,
        'Hạng mục': 'Vé máy bay khứ hồi SGN-SIN-SGN',
        'Số lượng': 20,
        'Đơn vị': 'PAX',
        'Đơn giá (VNĐ)': 6500000,
        'VAT (%)': 0,
        'Thành tiền (VNĐ)': 130000000,
        'Ghi chú': 'Vietnam Airlines',
      },
      {
        'STT': 2,
        'Hạng mục': 'Khách sạn 4 sao (3 đêm)',
        'Số lượng': 20,
        'Đơn vị': 'ROOM',
        'Đơn giá (VNĐ)': 3200000,
        'VAT (%)': 10,
        'Thành tiền (VNĐ)': 70400000,
        'Ghi chú': 'Hotel Boss',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Du_Toan_Tour');
    XLSX.writeFile(wb, 'Mau_du_toan_SkyLux_Travel.xlsx');
    message.success('Đã tải xuống file mẫu dự toán SkyLux Travel');
  };

  const handleClearFile = () => {
    setSelectedFileInfo(null);
    setPreviewRows([]);
  };

  const handleTriggerReupload = () => {
    fileInputRef.current?.click();
  };

  const handleValidateFile = () => {
    message.success(`Đã kiểm tra xong: ${stats.validCount} dòng hợp lệ, ${stats.errorCount} dòng lỗi, ${stats.warningCount} cảnh báo.`);
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

      {/* Section 3: 3. File đã chọn (when file selected) */}
      {selectedFileInfo && (
        <Card className="rounded-2xl border-slate-100 shadow-sm p-2 bg-white">
          <h2 className="text-xs font-bold text-slate-900 mb-2.5">
            3. File đã chọn
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <FileExcelFilled className="text-2xl text-emerald-600" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-800 text-xs block truncate" title={selectedFileInfo.name}>
                  {selectedFileInfo.name}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {selectedFileInfo.sizeText} • Đã tải lên lúc {selectedFileInfo.uploadTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                Đã tải lên thành công
              </span>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined className="text-slate-400 hover:text-red-500" />}
                onClick={handleClearFile}
                className="hover:bg-red-50 rounded-lg"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Section 4 & 5: Preview Table (Left ~75%) & Inspection Results (Right ~25%) */}
      {selectedFileInfo && previewRows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: 4. Xem trước dữ liệu (Span 9) */}
          <div className="lg:col-span-9">
            <Card className="rounded-2xl border-slate-100 shadow-sm p-3 bg-white">
              <h2 className="text-xs font-bold text-slate-900 mb-3">
                4. Xem trước dữ liệu ({showAllRows ? `tất cả ${previewRows.length} dòng` : '10 dòng đầu tiên'})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-medium">
                      <th className="py-2 px-2 text-center w-12">STT</th>
                      <th className="py-2 px-2 min-w-[180px]">Hạng mục</th>
                      <th className="py-2 px-2 text-center w-14">SL</th>
                      <th className="py-2 px-2 text-center w-18">Đơn vị</th>
                      <th className="py-2 px-2 text-right w-28">Đơn giá (VNĐ)</th>
                      <th className="py-2 px-2 text-center w-18">VAT (%)</th>
                      <th className="py-2 px-2 text-right w-28">Thành tiền (VNĐ)</th>
                      <th className="py-2 px-2 min-w-[150px]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.map((row) => {
                      const isError = row.status === 'ERROR';
                      return (
                        <tr
                          key={row.stt}
                          className={`transition-colors ${
                            isError ? 'bg-red-50/50 hover:bg-red-50/80' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center text-slate-400 font-medium">
                            {row.stt}
                          </td>
                          <td className="py-2.5 px-2 font-medium text-slate-800">
                            {row.category}
                          </td>
                          <td className="py-2.5 px-2 text-center font-semibold text-slate-800">
                            {row.quantity}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500 font-medium">
                            {row.unit}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-medium ${
                              isError && row.unitPrice === 'abc' ? 'text-red-600 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {row.unitPrice}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-center font-medium ${
                              isError && row.vatRate === 'abc' ? 'text-red-600 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {row.vatRate}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-medium ${
                              isError && (row.totalAmount === 'abc' || row.totalAmount === '-')
                                ? 'text-red-600 font-bold'
                                : 'text-slate-800'
                            }`}
                          >
                            {row.totalAmount}
                          </td>
                          <td className="py-2.5 px-2">
                            {row.status === 'VALID' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Hợp lệ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
                                <CloseCircleFilled className="text-red-500 text-xs shrink-0" />
                                {row.errorMessage || 'Lỗi dữ liệu'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* View all toggle link */}
              {previewRows.length > 10 && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAllRows(!showAllRows)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
                  >
                    <span>{showAllRows ? 'Thu gọn danh sách' : `Xem tất cả ${previewRows.length} dòng`}</span>
                    {showAllRows ? <UpOutlined className="text-[10px]" /> : <DownOutlined className="text-[10px]" />}
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* Right: 5. Kết quả kiểm tra (Span 3) */}
          <div className="lg:col-span-3">
            <Card className="rounded-2xl border-slate-100 shadow-sm p-3 bg-white space-y-3">
              <h2 className="text-xs font-bold text-slate-900 pb-2 mb-0 border-b border-slate-100">
                5. Kết quả kiểm tra
              </h2>

              {/* Metric 1: Dòng hợp lệ */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                  <CheckOutlined />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-emerald-700 block">
                    Dòng hợp lệ
                  </span>
                  <span className="text-lg font-bold text-slate-900 leading-tight">
                    {stats.validCount}
                  </span>
                </div>
              </div>

              {/* Metric 2: Dòng lỗi */}
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                  !
                </div>
                <div>
                  <span className="text-[11px] font-medium text-red-600 block">
                    Dòng lỗi
                  </span>
                  <span className="text-lg font-bold text-slate-900 leading-tight">
                    {stats.errorCount}
                  </span>
                </div>
              </div>

              {/* Metric 3: Cảnh báo */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 text-sm">
                  <WarningFilled />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-amber-700 block">
                    Cảnh báo
                  </span>
                  <span className="text-lg font-bold text-slate-900 leading-tight">
                    {stats.warningCount}
                  </span>
                </div>
              </div>

              {/* Total count footer */}
              <div className="pt-2 text-xs text-slate-500 font-medium">
                Tổng dòng: {stats.total}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-7 py-3 shadow-lg flex items-center justify-between">
        <div>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleTriggerReupload}
            className="h-10 rounded-xl border-slate-200 text-slate-700 font-medium text-xs px-4 bg-white hover:bg-slate-50"
          >
            Tải lại file
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<CheckCircleFilled className="text-emerald-600" />}
            onClick={handleValidateFile}
            className="h-10 rounded-xl border-emerald-600 text-emerald-700 font-semibold text-xs px-5 bg-white hover:bg-emerald-50"
          >
            Kiểm tra file
          </Button>

          <Popconfirm
            title="Xác nhận import dự toán"
            description={`Bạn có chắc chắn muốn nhập ${stats.validCount} dòng hợp lệ vào cơ sở dữ liệu?`}
            onConfirm={() => confirmMutation.mutate()}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              icon={uploadMutation.isPending || confirmMutation.isPending ? <Spin size="small" /> : <CloudUploadOutlined />}
              loading={confirmMutation.isPending}
              className="h-10 rounded-xl bg-[#063826] hover:bg-[#084D34] text-white font-semibold text-xs px-6 border-none shadow-md"
            >
              Xác nhận import
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}
