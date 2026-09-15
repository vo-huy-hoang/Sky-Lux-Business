"use client";

import React, { useState, useMemo } from "react";
import { Card, Spin } from "antd";
import { useImportValidation } from "../hooks/useImportValidation";
import {
  BarChartOutlined,
  CalculatorOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  FileExcelOutlined,
  TableOutlined,
  UpOutlined,
  WarningFilled,
} from "@ant-design/icons";
import {
  ImportSession,
  PaginatedImportErrorsResponse,
  PaginatedImportRowsResponse,
} from "@/types/import";

export interface ImportPreviewTableProps {
  session?: ImportSession;
  previewData?: PaginatedImportRowsResponse;
  errorsData?: PaginatedImportErrorsResponse;
  isLoading?: boolean;
}

function formatVND(num: number | string | undefined | null) {
  if (num === undefined || num === null || num === "") return "-";
  if (typeof num === "number") {
    return new Intl.NumberFormat("vi-VN").format(num);
  }
  const clean = String(num).trim().replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(clean);
  if (!isNaN(parsed) && isFinite(parsed)) {
    return new Intl.NumberFormat("vi-VN").format(parsed);
  }
  return String(num);
}

export function ImportPreviewTable({
  session: _session,
  previewData: _previewData,
  errorsData: _errorsData,
  isLoading,
}: ImportPreviewTableProps) {
  const [activeTab, setActiveTab] = useState<
    "ALL" | "REVENUE" | "COST" | "SUMMARY" | "RAW"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ERROR" | "WARNING" | "VALID"
  >("ALL");
  const [isRawExpanded, setIsRawExpanded] = useState(false);

  const {
    validCount,
    errorCount,
    warningCount,
    totalCount,
    revenues: allRevenues,
    costs: allCosts,
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    totalPax,
    classification,
    summary,
  } = useImportValidation(_previewData);

  // Filter revenue items
  const filteredRevenues = useMemo(() => {
    if (statusFilter === "ALL") return allRevenues;
    return allRevenues.filter((item) => item.status === statusFilter);
  }, [statusFilter, allRevenues]);

  // Filter cost items
  const filteredCosts = useMemo(() => {
    if (statusFilter === "ALL") return allCosts;
    return allCosts.filter((item) => item.status === statusFilter);
  }, [statusFilter, allCosts]);

  // Group costs by category
  const costGroups = useMemo(() => {
    const groups: { [key: string]: typeof allCosts } = {};
    filteredCosts.forEach((item) => {
      const g = item.categoryGroup || "DỊCH VỤ";
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [filteredCosts]);

  return (
    <Card
      className="skylux-card shadow-xs rounded-xl overflow-hidden border border-[#E5E8E6]"
      styles={{
        header: {
          borderBottom: "1px solid #EEF1EF",
          padding: "12px 18px",
          background: "#FFFFFF",
        },
        body: {
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        },
      }}
      title={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              4. Xem trước dữ liệu dự toán (Đầy đủ 3 bảng chi tiết)
            </span>
            {isLoading && <Spin size="small" />}
          </div>

          {/* Tab Selector theo đúng form chi tiết hồ sơ */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                activeTab === "ALL"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <TableOutlined className="text-xs" />
              <span>Tất cả (3 bảng)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("REVENUE")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                activeTab === "REVENUE"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChartOutlined className="text-xs" />
              <span>1. Doanh thu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("COST")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                activeTab === "COST"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileExcelOutlined className="text-xs" />
              <span>2. Chi phí dịch vụ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SUMMARY")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                activeTab === "SUMMARY"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalculatorOutlined className="text-xs" />
              <span>3. Tổng hợp chi phí</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("RAW")}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border-0 ${
                activeTab === "RAW"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "bg-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <span>Dữ liệu thô Excel</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-500">Phân loại hồ sơ:</span>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-bold text-amber-800">
          Mảng: {classification.businessLine}
        </span>
        <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 font-bold text-sky-800">
          Loại hình: {classification.marketType}
        </span>
      </div>

      {/* 🔴 THANH CẢNH BÁO NỔI BẬT DÒNG LỖI & CẢNH BÁO ĐỂ NGƯỜI DÙNG DỄ NHÌN THẤY */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50/90 via-amber-50/70 to-emerald-50/40 border border-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
            !
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              Phát hiện{" "}
              <span className="text-rose-600 font-extrabold bg-rose-100/90 px-1.5 py-0.5 rounded">
                {errorCount + (_errorsData?.data?.length || 0)} dòng lỗi
              </span>{" "}
              và{" "}
              <span className="text-amber-700 font-extrabold bg-amber-100/90 px-1.5 py-0.5 rounded">
                {warningCount} cảnh báo
              </span>{" "}
              trong dữ liệu dự toán
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Các dòng này đã được{" "}
              <span className="font-semibold text-rose-700">
                tô màu hồng viền đỏ
              </span>{" "}
              và{" "}
              <span className="font-semibold text-amber-700">
                tô màu vàng viền cam
              </span>{" "}
              trực quan ngay trong bảng để bạn dễ kiểm tra.
            </div>
          </div>
        </div>

        {/* Nút lọc nhanh theo trạng thái */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[11px] text-slate-500 mr-1 font-medium hidden sm:inline">
            Lọc xem:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer border ${
              statusFilter === "ALL"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ERROR")}
            className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer border ${
              statusFilter === "ERROR"
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            }`}
          >
            Dòng lỗi ({errorCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("WARNING")}
            className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer border ${
              statusFilter === "WARNING"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            Cảnh báo ({warningCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("VALID")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer border ${
              statusFilter === "VALID"
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Hợp lệ ({validCount})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BẢNG 1: CHI TIẾT DOANH THU TOUR */}
      {/* ========================================================================= */}
      {(activeTab === "ALL" || activeTab === "REVENUE") && (
        <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-xs overflow-hidden">
          <div className="pb-3 mb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChartOutlined className="text-emerald-700 text-sm" />
              <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                Bảng 1: Chi tiết doanh thu tour
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Tổng doanh thu: {formatVND(totalRevenue)} đ
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-2.5 text-center w-12 font-bold">
                    STT
                  </th>
                  <th className="py-2.5 px-3 text-left min-w-[180px] font-bold">
                    Hạng mục
                  </th>
                  <th className="py-2.5 px-3 text-left min-w-[200px] font-bold">
                    Diễn giải
                  </th>
                  <th className="py-2.5 px-2 text-center w-16 font-bold">
                    ĐVT
                  </th>
                  <th className="py-2.5 px-2 text-center w-16 font-bold">SL</th>
                  <th className="py-2.5 px-3 text-right w-32 font-bold">
                    Đơn giá
                  </th>
                  <th className="py-2.5 px-3 text-right w-36 font-bold">
                    Thành tiền
                  </th>
                  <th className="py-2.5 px-3 text-left w-48 font-bold">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredRevenues.map((row) => {
                  const isWarning = row.status === "WARNING";
                  const isError = row.status === "ERROR";

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isError
                          ? "bg-[#FFF5F5] hover:bg-[#FFEBEB] border-l-4 border-l-rose-500"
                          : isWarning
                            ? "bg-[#FFFBEB] hover:bg-[#FEF3C7] border-l-4 border-l-amber-500"
                            : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {row.stt}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 text-xs">
                        {row.category}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                        {row.description}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 text-xs">
                        {row.unit}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-800 text-xs">
                        {row.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 text-xs">
                        {formatVND(row.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatVND(row.grossAmount)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <WarningFilled className="text-amber-600 text-xs" />
                            {row.statusMessage || "Cảnh báo"}
                          </span>
                        ) : isError ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            <CloseCircleFilled className="text-rose-600 text-xs" />
                            {row.statusMessage || "Lỗi dữ liệu"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EDF8F4] text-[#007A55] border border-emerald-200/60">
                            <CheckCircleFilled className="text-emerald-500 text-[10px]" />
                            Hợp lệ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-200 text-slate-900">
                  <td
                    colSpan={4}
                    className="py-2.5 px-3 uppercase text-xs text-emerald-900"
                  >
                    TỔNG CỘNG DOANH THU
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-extrabold text-xs text-emerald-900">
                    {totalPax}
                  </td>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-xs text-emerald-900">
                    {formatVND(totalRevenue)} đ
                  </td>
                  <td className="py-2.5 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BẢNG 2: CHI TIẾT DỰ TOÁN CHI PHÍ DỊCH VỤ TOUR (CÓ HIGHLIGHT 3 DÒNG LỖI) */}
      {/* ========================================================================= */}
      {(activeTab === "ALL" || activeTab === "COST") && (
        <div className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileExcelOutlined className="text-emerald-700 text-sm" />
              <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                Bảng 2: Chi tiết dự toán chi phí dịch vụ tour
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                {errorCount} dòng lỗi cần xử lý
              </span>
              <span className="text-xs font-bold font-mono text-slate-800 bg-slate-100 px-3 py-1 rounded-full">
                Tổng chi phí: {formatVND(totalCost)} đ
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-2.5 text-center w-12 font-bold">
                    STT
                  </th>
                  <th className="py-2.5 px-3 text-left min-w-[200px] font-bold">
                    Nội dung dịch vụ
                  </th>
                  <th className="py-2.5 px-3 text-left min-w-[180px] font-bold">
                    Diễn giải / Nhà cung cấp
                  </th>
                  <th className="py-2.5 px-2 text-center w-14 font-bold">SL</th>
                  <th className="py-2.5 px-2 text-center w-24 font-bold">
                    ĐVT
                  </th>
                  <th className="py-2.5 px-3 text-right w-28 font-bold">
                    Đơn giá (VNĐ)
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 font-bold">
                    VAT (%)
                  </th>
                  <th className="py-2.5 px-3 text-right w-32 font-bold">
                    Thành tiền (VNĐ)
                  </th>
                  <th className="py-2.5 px-3 text-left min-w-[170px] font-bold">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {Object.entries(costGroups).map(([groupTitle, items]) => (
                  <React.Fragment key={groupTitle}>
                    {/* Header phân nhóm */}
                    <tr className="bg-slate-100/90 border-t border-b border-slate-200/80">
                      <td
                        colSpan={9}
                        className="py-2 px-3 font-bold text-slate-800 text-[11px] uppercase"
                      >
                        {groupTitle}
                      </td>
                    </tr>

                    {/* Các dòng trong nhóm */}
                    {items.map((row) => {
                      const isError = row.status === "ERROR";
                      const isWarning = row.status === "WARNING";

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isError
                              ? "bg-[#FFF5F5] hover:bg-[#FFE8E8] border-l-4 border-l-rose-500"
                              : isWarning
                                ? "bg-[#FFFBEB] hover:bg-[#FEF3C7] border-l-4 border-l-amber-500"
                                : "hover:bg-slate-50/70"
                          }`}
                        >
                          {/* STT */}
                          <td
                            className={`py-2 px-2.5 text-center font-mono text-[11px] ${
                              isError
                                ? "text-rose-600 font-bold"
                                : "text-slate-500"
                            }`}
                          >
                            {row.stt}
                          </td>

                          {/* Nội dung dịch vụ */}
                          <td className="py-2 px-3 font-semibold text-slate-800 text-xs">
                            {row.content}
                          </td>

                          {/* Nhà cung cấp */}
                          <td className="py-2 px-3 text-slate-600 text-xs">
                            {row.supplier}
                          </td>

                          {/* SL */}
                          <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 text-xs">
                            {row.quantity}
                          </td>

                          {/* ĐVT */}
                          <td className="py-2 px-2 text-center text-slate-600 text-xs">
                            {row.unitText}
                          </td>

                          {/* Đơn giá (TÔ ĐỎ NẾU LỖI) */}
                          <td className="py-2 px-3 text-right font-mono text-xs">
                            {row.unitPriceError ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300 inline-block">
                                {String(row.unitPrice)}
                              </span>
                            ) : (
                              <span className="text-slate-700">
                                {formatVND(row.unitPrice)}
                              </span>
                            )}
                          </td>

                          {/* VAT (TÔ ĐỎ NẾU LỖI) */}
                          <td className="py-2 px-2 text-center font-mono text-xs">
                            {row.vatRateError ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300 inline-block">
                                {String(row.vatRate)}
                              </span>
                            ) : (
                              <span className="text-slate-700">
                                {row.vatRate}%
                              </span>
                            )}
                          </td>

                          {/* Thành tiền (TÔ ĐỎ NẾU LỖI) */}
                          <td className="py-2 px-3 text-right font-mono text-xs">
                            {row.totalAmountError ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300 inline-block">
                                {String(row.totalAmount)}
                              </span>
                            ) : (
                              <span className="text-slate-900 font-bold">
                                {formatVND(row.totalAmount)}
                              </span>
                            )}
                          </td>

                          {/* Trạng thái (HIỂN THỊ CHI TIẾT LÝ DO LỖI) */}
                          <td className="py-2 px-3">
                            {isError ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                <CloseCircleFilled className="text-rose-600 text-xs" />
                                {row.statusMessage}
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                <WarningFilled className="text-amber-600 text-xs" />
                                {row.statusMessage}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EDF8F4] text-[#007A55] border border-emerald-200/60">
                                <CheckCircleFilled className="text-emerald-500 text-[10px]" />
                                Hợp lệ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={7} className="py-2.5 px-3 uppercase text-xs">
                    TỔNG CỘNG CHI PHÍ TOUR
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-xs text-slate-900">
                    {formatVND(totalCost)} đ
                  </td>
                  <td className="py-2.5 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BẢNG 3: BẢNG TỔNG HỢP CHI PHÍ & ĐỐI SOÁT HIỆU QUẢ */}
      {/* ========================================================================= */}
      {(activeTab === "ALL" || activeTab === "SUMMARY") && (
        <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-xs overflow-hidden">
          <div className="pb-3 mb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalculatorOutlined className="text-emerald-700 text-sm" />
              <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                Bảng 3: Bảng tổng hợp chi phí & Đối soát hiệu quả kinh doanh
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Lợi nhuận gộp: {formatVND(totalProfit)} đ ({profitMargin})
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 text-left font-bold">
                    Phân loại dịch vụ
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold">
                    Doanh thu từ khách
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold">
                    DT thuần (1.08)
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold">Chi phí</th>
                  <th className="py-2.5 px-3 text-right font-bold">
                    Chi phí thuần
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold">Lãi gộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    Dịch vụ 10% (Có VAT)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service10.customerRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service10.netRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service10.cost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service10.netCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {formatVND(summary.service10.grossProfit)}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    Dịch vụ 0% (Không VAT)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">0</td>
                  <td className="py-2.5 px-3 text-right font-mono">0</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service0.cost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service0.netCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                    {formatVND(summary.service0.grossProfit)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-300 text-slate-900">
                  <td className="py-2.5 px-3 uppercase text-xs text-emerald-950 font-bold">
                    TỔNG CỘNG ĐỐI SOÁT
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-950">
                    {formatVND(summary.total.customerRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-950">
                    {formatVND(summary.total.netRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                    {formatVND(summary.total.cost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                    {formatVND(summary.total.netCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800 text-sm">
                    {formatVND(summary.total.grossProfit)} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DỮ LIỆU THÔ EXCEL (8 CỘT GỐC ĐỂ KIỂM TRA LỖI NHẬP) */}
      {/* ========================================================================= */}
      {activeTab === "RAW" && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Danh sách dòng dữ liệu gốc từ file Excel
            </span>
            <span className="text-xs text-slate-400">
              Hiển thị {isRawExpanded ? allCosts.length : 10} /{" "}
              {allCosts.length} dòng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBFB] text-slate-700 font-semibold border-b border-[#E5E8E6]">
                  <th className="py-2.5 px-3 text-center w-12 text-slate-500 font-medium">
                    STT
                  </th>
                  <th className="py-2.5 px-3.5 min-w-[190px]">Hạng mục</th>
                  <th className="py-2.5 px-3 text-center w-14">SL</th>
                  <th className="py-2.5 px-3 min-w-[70px]">Đơn vị</th>
                  <th className="py-2.5 px-3.5 text-right min-w-[120px]">
                    Đơn giá (VND)
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[75px]">
                    VAT (%)
                  </th>
                  <th className="py-2.5 px-3.5 text-right min-w-[130px]">
                    Thành tiền (VND)
                  </th>
                  <th className="py-2.5 px-3.5 min-w-[160px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(isRawExpanded ? allCosts : allCosts.slice(0, 10)).map(
                  (row) => {
                    const isError = row.status === "ERROR";
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isError
                            ? "bg-[#FFF5F5] hover:bg-[#FFEBEB] border-l-4 border-l-rose-500"
                            : "bg-white hover:bg-slate-50/70"
                        }`}
                      >
                        <td
                          className={`py-2.5 px-3 text-center font-medium ${isError ? "text-rose-600 font-bold" : "text-slate-500"}`}
                        >
                          {row.stt}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-800 font-normal">
                          {row.content}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 font-mono">
                          {row.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {row.unitText}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono">
                          {row.unitPriceError ? (
                            <span className="text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              {String(row.unitPrice)}
                            </span>
                          ) : (
                            <span className="text-slate-800">
                              {formatVND(row.unitPrice)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.vatRateError ? (
                            <span className="text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              {String(row.vatRate)}
                            </span>
                          ) : (
                            <span className="text-slate-800">
                              {String(row.vatRate)}%
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono">
                          {row.totalAmountError ? (
                            <span className="text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              {String(row.totalAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-800 font-medium">
                              {formatVND(row.totalAmount)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {isError ? (
                            <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <CloseCircleFilled className="text-rose-500 text-xs" />
                              {row.statusMessage}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-[#EDF8F4] text-[#007A55] border border-emerald-200/60">
                              Hợp lệ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          <div className="px-3.5 py-2.5 border-t border-slate-100 bg-[#FCFDFC]">
            <button
              type="button"
              onClick={() => setIsRawExpanded(!isRawExpanded)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            >
              <span>
                {isRawExpanded
                  ? "Thu gọn về 10 dòng đầu"
                  : `Xem tất cả ${allCosts.length} dòng`}
              </span>
              {isRawExpanded ? (
                <UpOutlined className="text-[10px]" />
              ) : (
                <DownOutlined className="text-[10px]" />
              )}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ImportPreviewTable;
