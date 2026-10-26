"use client";

import React from "react";
import { Card } from "antd";
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
  WarningFilled,
} from "@ant-design/icons";
import { ImportSession, PaginatedImportErrorsResponse, PaginatedImportRowsResponse } from "@/types/import";
import { useImportValidation } from "../hooks/useImportValidation";

export interface ImportErrorSidebarProps {
  session?: ImportSession;
  previewData?: PaginatedImportRowsResponse;
  errorsData?: PaginatedImportErrorsResponse;
}

const CHECKLIST_ITEMS = [
  "File phải có định dạng .xlsx",
  "Đúng cấu trúc theo mẫu (không thêm/xóa cột)",
  "Dòng tiêu đề ở dòng đầu tiên",
  "SL, Đơn giá, VAT phải là số",
  "Đơn giá, Thành tiền phải là số dương",
  "VAT nhập theo % (ví dụ: 10 cho 10%)",
  "Không để trống Hạng mục và Đơn vị",
];

export function ImportErrorSidebar({ session, previewData, errorsData }: ImportErrorSidebarProps) {
  const { validCount, errorCount, warningCount, totalCount } = useImportValidation(previewData);
  const importErrorRowCount = session?.errorRows ?? 0;

  return (
    <div className="space-y-4">
      {/* 1. Lưu ý kiểm tra dữ liệu */}
      <Card
        className="skylux-card shadow-xs rounded-xl overflow-hidden border border-[#E5E8E6]"
        styles={{
          header: {
            borderBottom: "1px solid #EEF1EF",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#1E293B",
          },
          body: { padding: "16px 18px" },
        }}
        title="Lưu ý kiểm tra dữ liệu"
      >
        <div className="space-y-2 text-xs text-slate-700">
          {CHECKLIST_ITEMS.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-snug">
              <CheckCircleOutlined className="text-emerald-600 text-xs shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100/90 text-xs text-emerald-900 flex items-start gap-2.5 leading-relaxed">
          <InfoCircleFilled className="text-emerald-600 text-sm shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-emerald-950">
              Chỉ những dòng hợp lệ mới được import.
            </div>
            <div className="text-emerald-800/80 text-[11px] mt-0.5">
              Các dòng lỗi sẽ được hiển thị để bạn kiểm tra.
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Phần 5: Kết quả kiểm tra */}
      <Card
        className="skylux-card shadow-xs rounded-xl overflow-hidden border border-[#E5E8E6]"
        styles={{
          header: {
            borderBottom: "1px solid #EEF1EF",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#1E293B",
          },
          body: { padding: "16px 18px" },
        }}
        title="5. Kết quả kiểm tra"
      >
        <div className="space-y-3">
          {/* Dòng hợp lệ */}
          <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-emerald-100/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-base shadow-xs">
                <CheckCircleFilled />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Dòng chi tiết hợp lệ
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800">
              {validCount}
            </div>
          </div>

          {/* Dòng lỗi */}
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-rose-100/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white text-base shadow-xs">
                <ExclamationCircleFilled />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Dòng chi tiết lỗi
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700">
              {errorCount}
            </div>
          </div>

          {/* Cảnh báo */}
          <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-amber-100/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-base shadow-xs">
                <WarningFilled />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Cảnh báo dòng chi tiết
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700">
              {warningCount}
            </div>
          </div>

          <div className="pt-2 text-left text-xs font-medium text-slate-500">
            Tổng dòng chi tiết:{" "}
            <span className="font-semibold text-slate-800 font-mono">
              {totalCount}
            </span>
          </div>

          {importErrorRowCount > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <div className="font-bold">
                Lỗi hồ sơ: {importErrorRowCount}
              </div>
              <div className="mt-1 text-[11px] text-rose-700/80">
                Đây là lỗi ở hồ sơ import, không nằm trong các dòng chi tiết ở
                trên.
              </div>
            </div>
          )}

          {/* Lỗi từ hệ thống (Dossier-level errors) */}
          {errorsData?.data && errorsData.data.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2">
                Chi tiết lỗi hồ sơ:
              </div>
              <div className="space-y-2">
                {errorsData.data.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex gap-2 items-start"
                  >
                    <ExclamationCircleFilled className="text-rose-500 mt-0.5 shrink-0" />
                    <span>{err.errorMessage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ImportErrorSidebar;
