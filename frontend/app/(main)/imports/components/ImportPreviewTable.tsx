"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  Spin,
  Tag,
  Select,
  Button,
  Radio,
  App,
  Input,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { importsService } from "@/services/imports.service";
import {
  calculateImportSummary,
  useImportValidation,
} from "../hooks/useImportValidation";
import {
  BarChartOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  PlusCircleOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  TableOutlined,
  UpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  ImportRow,
  ImportSession,
  PaginatedImportErrorsResponse,
  PaginatedImportRowsResponse,
} from "@/types/import";

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export interface ImportPreviewTableProps {
  session?: ImportSession;
  previewData?: PaginatedImportRowsResponse;
  errorsData?: PaginatedImportErrorsResponse;
  isLoading?: boolean;
  onEditMetadata?: (row: ImportRow) => void;
}

function formatVND(num: number | string | undefined | null) {
  if (num === undefined || num === null || num === "") return "-";
  if (typeof num === "number") {
    return vndFormatter.format(Math.round(num));
  }
  const clean = String(num).trim().replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(clean);
  if (!isNaN(parsed) && isFinite(parsed)) {
    return vndFormatter.format(Math.round(parsed));
  }
  return String(num);
}

function vatRateOf(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "")
    .trim()
    .replace(/%/g, "")
    .replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ImportPreviewTable({
  session,
  previewData: _previewData,
  isLoading,
  onEditMetadata,
}: ImportPreviewTableProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "ALL" | "REVENUE" | "COST" | "SUMMARY" | "RAW"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ERROR" | "WARNING" | "VALID"
  >("ALL");
  const [isRawExpanded, setIsRawExpanded] = useState(false);

  // Local state for interactive VAT overrides
  const [vatOverrides, setVatOverrides] = useState<Record<string, number>>({});
  const [reconciliationChoice, setReconciliationChoice] = useState<
    "USE_CALCULATED_ITEMS" | "PRESERVE_EXCEL_SUMMARY"
  >("USE_CALCULATED_ITEMS");
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  const {
    validCount,
    errorCount,
    warningCount,
    totalCount,
    revenues: allRevenues,
    costs: allCosts,
    totalRevenue,
    totalPax,
    sourceSummary,
    rawRow,
    isCustomerBudget,
    metadata,
    financialReconciliation: hookReconciliation,
  } = useImportValidation(_previewData);

  // Merge cost items with interactive local VAT overrides
  const costsWithOverrides = useMemo(() => {
    return allCosts.map((c) => {
      if (vatOverrides[c.id] !== undefined) {
        const newVat = vatOverrides[c.id];
        return {
          ...c,
          vatRate: newVat,
        };
      }
      return c;
    });
  }, [allCosts, vatOverrides]);

  const summary = useMemo(() => {
    return calculateImportSummary(allRevenues, costsWithOverrides);
  }, [allRevenues, costsWithOverrides]);

  const totalCost = useMemo(() => {
    return costsWithOverrides.reduce(
      (sum, item) => sum + (Number(item.totalAmount) || 0),
      0,
    );
  }, [costsWithOverrides]);

  const currentReconciliation = useMemo(() => {
    const calcRev = totalRevenue;
    const calcCost = totalCost;

    // Use VAT-adjusted net gross profit from calculateImportSummary (standard travel agency formula)
    const netGrossProfit = summary.total.grossProfit;
    const netProfitMargin =
      summary.total.netRevenue > 0
        ? Number(
            ((netGrossProfit / summary.total.netRevenue) * 100).toFixed(2),
          )
        : 0;

    const grossProfit = calcRev - calcCost;
    const grossProfitMargin =
      calcRev > 0 ? Number(((grossProfit / calcRev) * 100).toFixed(2)) : 0;

    let calcGrossProfit = grossProfit;
    let calcProfitMargin = grossProfitMargin;
    let prfDelta = 0;

    if (sourceSummary.totalProfit !== undefined) {
      const netDelta = Math.abs(netGrossProfit - sourceSummary.totalProfit);
      const grossDelta = Math.abs(grossProfit - sourceSummary.totalProfit);
      if (netDelta <= 1000 && netDelta < grossDelta) {
        calcGrossProfit = netGrossProfit;
        calcProfitMargin = netProfitMargin;
        prfDelta = netDelta;
      } else if (grossDelta <= 1000) {
        calcGrossProfit = grossProfit;
        calcProfitMargin = grossProfitMargin;
        prfDelta = grossDelta;
      } else {
        if (netDelta < grossDelta) {
          calcGrossProfit = netGrossProfit;
          calcProfitMargin = netProfitMargin;
          prfDelta = netDelta;
        } else {
          calcGrossProfit = grossProfit;
          calcProfitMargin = grossProfitMargin;
          prfDelta = grossDelta;
        }
      }
    }

    const revDelta = sourceSummary.totalRevenue
      ? Math.abs(calcRev - sourceSummary.totalRevenue)
      : 0;
    const cstDelta = sourceSummary.totalCost
      ? Math.abs(calcCost - sourceSummary.totalCost)
      : 0;

    const hasLineTampering = costsWithOverrides.some((c) => c.isTamperedFormula);
    let status: "MATCHED" | "ROUNDING_TOLERANCE" | "MISMATCH" = "MATCHED";
    if (
      revDelta > 1000 ||
      cstDelta > 1000 ||
      prfDelta > 1000 ||
      hasLineTampering
    ) {
      status = "MISMATCH";
    } else if (revDelta > 1 || cstDelta > 1 || prfDelta > 1) {
      status = "ROUNDING_TOLERANCE";
    }

    return {
      calculatedRevenue: calcRev,
      calculatedCost: calcCost,
      calculatedGrossProfit: calcGrossProfit,
      calculatedProfitMarginPercent: calcProfitMargin,
      revenueDelta: revDelta,
      costDelta: cstDelta,
      profitDelta: prfDelta,
      status,
      warnings: hookReconciliation.warnings || [],
    };
  }, [
    totalRevenue,
    totalCost,
    summary,
    sourceSummary,
    costsWithOverrides,
    hookReconciliation.warnings,
  ]);

  const importErrorRowCount = session?.errorRows ?? 0;
  const hasPendingVatChanges = Object.keys(vatOverrides).length > 0;

  // Filter revenue items
  const filteredRevenues = useMemo(() => {
    if (statusFilter === "ALL") return allRevenues;
    return allRevenues.filter((item) => item.status === statusFilter);
  }, [statusFilter, allRevenues]);

  // Filter cost items
  const filteredCosts = useMemo(() => {
    if (statusFilter === "ALL") return costsWithOverrides;
    return costsWithOverrides.filter((item) => item.status === statusFilter);
  }, [statusFilter, costsWithOverrides]);

  // Group costs by category
  const costGroups = useMemo(() => {
    const groups: { [key: string]: typeof costsWithOverrides } = {};
    filteredCosts.forEach((item) => {
      const g = item.categoryGroup || "DỊCH VỤ";
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [filteredCosts]);

  // State for inline description editing
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>("");

  const handleStartEditDescription = (lineId: string, currentText: string) => {
    setEditingLineId(lineId);
    setEditingDescription(currentText);
  };

  const handleSaveDescription = async (lineIdx: number) => {
    if (!session?.id || !rawRow?.id) return;
    try {
      const rawCostLines = [...(rawRow.rawData?.__costLines || [])];
      if (rawCostLines[lineIdx]) {
        rawCostLines[lineIdx] = {
          ...rawCostLines[lineIdx],
          description: editingDescription.trim(),
        };
        const updatedRawData = {
          ...(rawRow.rawData || {}),
          __costLines: rawCostLines,
        };
        await importsService.updateRowStaging(session.id, rawRow.id, {
          rawData: updatedRawData,
        });
        message.success("Đã cập nhật tên dịch vụ");
        setEditingLineId(null);
        await queryClient.invalidateQueries({ queryKey: queryKeys.imports.all });
      }
    } catch (err: any) {
      message.error(err?.message || "Không thể cập nhật tên dịch vụ");
    }
  };

  const handleDeleteCostLine = async (lineIdx: number) => {
    if (!session?.id || !rawRow?.id) return;
    try {
      const rawCostLines = [...(rawRow.rawData?.__costLines || [])];
      rawCostLines.splice(lineIdx, 1);
      const updatedRawData = {
        ...(rawRow.rawData || {}),
        __costLines: rawCostLines,
      };
      await importsService.updateRowStaging(session.id, rawRow.id, {
        rawData: updatedRawData,
      });
      message.success("Đã xóa dòng dịch vụ khỏi dự toán");
      await queryClient.invalidateQueries({ queryKey: queryKeys.imports.all });
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa dòng dịch vụ");
    }
  };

  // Handler for line VAT change
  const handleVatChange = (lineId: string, rate: number) => {
    setVatOverrides((prev) => ({
      ...prev,
      [lineId]: rate,
    }));
  };

  // Bulk apply VAT to Section I
  const handleBulkApplyVat = (rate: number) => {
    const newOverrides = { ...vatOverrides };
    allCosts.forEach((c) => {
      if (c.isVatSection || /CÓ\s*VAT/i.test(c.categoryGroup || "")) {
        newOverrides[c.id] = rate;
      }
    });
    setVatOverrides(newOverrides);
    message.info(
      `Đã áp dụng mức thuế VAT ${rate}% cho toàn bộ Mục I (bấm 'Lưu thay đổi thuế' để lưu)`,
    );
  };

  // Save VAT changes to backend staging
  const handleSaveVatChanges = async () => {
    if (!session?.id || !rawRow?.id) return;
    setIsSavingChanges(true);
    try {
      const rawCostLines = rawRow.rawData?.__costLines || [];
      const updatedCostLines = rawCostLines.map((line: any, idx: number) => {
        const lineId = `cost-${idx}`;
        if (vatOverrides[lineId] !== undefined) {
          return {
            ...line,
            vatRate: vatOverrides[lineId],
          };
        }
        return line;
      });

      const updatedRawData = {
        ...(rawRow.rawData || {}),
        __costLines: updatedCostLines,
        __reconciliationResolution: reconciliationChoice,
      };

      await importsService.updateRowStaging(session.id, rawRow.id, {
        rawData: updatedRawData,
      });
      setVatOverrides({});
      message.success("Đã lưu mức thuế và tự động chạy lại đối soát tài chính");
      await queryClient.invalidateQueries({ queryKey: queryKeys.imports.all });
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu thay đổi thuế");
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Handle reconciliation choice selection
  const handleReconciliationChoiceChange = async (
    choice: "USE_CALCULATED_ITEMS" | "PRESERVE_EXCEL_SUMMARY",
  ) => {
    setReconciliationChoice(choice);
    if (session?.id && rawRow?.id) {
      try {
        const updatedRawData = {
          ...(rawRow.rawData || {}),
          __reconciliationResolution: choice,
        };
        await importsService.updateRowStaging(session.id, rawRow.id, {
          rawData: updatedRawData,
        });
        message.success("Đã ghi nhận phương án giải quyết đối soát");
      } catch {
        // Continue with local selection
      }
    }
  };

  return (
    <Card
      className="skylux-card shadow-xs rounded-xl overflow-hidden border border-[var(--color-border)]"
      styles={{
        header: {
          borderBottom: "1px solid var(--color-border-secondary)",
          padding: "12px 18px",
          background: "var(--color-surface)",
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
              4. Xem trước dữ liệu dự toán (Kiểm soát 3 thẻ chuyên sâu)
            </span>
            {isLoading && <Spin size="small" />}
          </div>

          {/* Tab Selector */}
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
              <span>Tất cả (3 thẻ)</span>
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
      {/* ========================================================================= */}
      {/* 🟢 THẺ 1: THÔNG TIN TOUR & KHÁCH HÀNG (TOUR & CLIENT METADATA CARD)       */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[var(--color-divider)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-950)] bg-[var(--color-primary-soft)] px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                Thẻ 1: Thông tin Tour & Khách hàng
              </span>
              <Tag className="font-semibold text-xs m-0 border border-emerald-300 bg-[var(--color-primary-soft)] text-[var(--color-primary-900)]">
                Mảng: {metadata.businessLine || "TOUR"}
              </Tag>
              <Tag className="font-semibold text-xs m-0 border border-slate-300 bg-[var(--color-surface-muted)] text-slate-700">
                Loại hình: {metadata.marketType || "NỘI ĐỊA"}
              </Tag>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-0 pt-0.5">
              {metadata.tourName || "Dự toán Tour SkyLux"}
            </h3>
          </div>

          {onEditMetadata && rawRow && (
            <Button
              type="default"
              icon={<EditOutlined />}
              size="small"
              className="text-xs font-semibold rounded-lg hover:border-emerald-600 hover:text-emerald-700"
              onClick={() => onEditMetadata(rawRow)}
            >
              Chỉnh sửa thông tin
            </Button>
          )}
        </div>

        {/* Surface & Divider Architecture (No Card-in-Card Nesting) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3.5 text-xs divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-divider)]">
          <div className="pt-2 sm:pt-0 sm:px-3 first:pl-0">
            <div className="text-[var(--color-text-muted)] font-medium text-[11px] mb-1 uppercase tracking-wider">
              Khách hàng
            </div>
            <div className="font-bold text-slate-800 text-sm">
              {metadata.customerName || "-"}
            </div>
            <div className="text-[var(--color-text-soft)] mt-0.5">
              {metadata.phone ? `SĐT: ${metadata.phone}` : "Chưa có SĐT"}
            </div>
            {metadata.customerStatus === "EXISTING" ? (
              <Tag
                icon={<CheckCircleOutlined className="text-[11px]" />}
                className="font-medium text-[11px] rounded-md px-2 py-0.5 border border-[var(--color-primary-300)] bg-[var(--color-primary-soft)] text-[var(--color-primary-900)] mt-1.5 inline-flex items-center gap-1"
              >
                Khách hàng có sẵn (Tái sử dụng)
              </Tag>
            ) : (
              <Tag
                icon={<PlusCircleOutlined className="text-[11px]" />}
                className="font-medium text-[11px] rounded-md px-2 py-0.5 border border-[var(--color-warning-300)] bg-[var(--color-warning-soft)] text-[var(--color-warning-900)] mt-1.5 inline-flex items-center gap-1"
              >
                Tạo KH mới khi xác nhận
              </Tag>
            )}
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <div className="text-[var(--color-text-muted)] font-medium text-[11px] mb-1 uppercase tracking-wider">
              Tuyến hành trình & Thời gian
            </div>
            <div className="font-bold text-slate-800">
              {metadata.route || "-"}
            </div>
            <div className="text-[var(--color-primary-700)] font-semibold mt-0.5">
              {metadata.tourDuration || "-"}
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <div className="text-[var(--color-text-muted)] font-medium text-[11px] mb-1 uppercase tracking-wider">
              Thời gian khởi hành
            </div>
            <div className="font-bold text-slate-800">
              {metadata.startDate || "Chưa rõ"} &rarr; {metadata.endDate || "Chưa rõ"}
            </div>
            <div className="text-[var(--color-text-soft)] mt-0.5 truncate">
              Email: {metadata.email || "-"}
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <div className="text-[var(--color-text-muted)] font-medium text-[11px] mb-1 uppercase tracking-wider">
              Quy mô đoàn & Cấu thành
            </div>
            <div className="font-bold text-[var(--color-primary-950)] text-sm tabular-nums font-mono">
              {totalPax} khách (PAX)
            </div>
            <div className="text-[var(--color-text-soft)] mt-0.5">
              {allCosts.length} dịch vụ cấu thành
            </div>
          </div>
        </div>
      </div>

      {/* THANH CẢNH BÁO NỔI BẬT DÒNG LỖI & CẢNH BÁO */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50/90 via-amber-50/70 to-emerald-50/40 border border-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
            !
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              Phát hiện{" "}
              <span className="text-rose-600 font-extrabold bg-rose-100/90 px-1.5 py-0.5 rounded">
                {errorCount} dòng lỗi
              </span>{" "}
              và{" "}
              <span className="text-amber-700 font-extrabold bg-amber-100/90 px-1.5 py-0.5 rounded">
                {warningCount} cảnh báo
              </span>{" "}
              trong dữ liệu dự toán
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Các dòng chi tiết đã được tô màu hồng viền đỏ và vàng viền cam để
              bạn dễ kiểm tra.
            </div>
            {importErrorRowCount > 0 && (
              <div className="text-[11px] text-rose-700 mt-1 font-medium">
                Hồ sơ có {importErrorRowCount} lỗi cần xử lý riêng.
              </div>
            )}
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
      {/* 1. BẢNG 1: CHI TIẾT DOANH THU TOUR                                        */}
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
                          ? "bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500"
                          : isWarning
                            ? "bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500"
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
                      <td className="py-2.5 px-2 text-center tabular-nums font-mono font-semibold text-slate-800 text-xs">
                        {row.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-mono text-slate-700 text-xs">
                        {formatVND(row.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold text-slate-900 text-xs">
                        {formatVND(row.grossAmount)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <WarningOutlined className="text-amber-600 text-xs" />
                            {row.statusMessage || "Cảnh báo"}
                          </span>
                        ) : isError ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            <CloseCircleOutlined className="text-rose-600 text-xs" />
                            {row.statusMessage || "Lỗi dữ liệu"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-primary-soft)] text-[var(--color-primary-700)] border border-emerald-200/60">
                            <CheckCircleOutlined className="text-emerald-500 text-[10px]" />
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
      {/* 2. BẢNG 2: CHI TIẾT DỰ TOÁN CHI PHÍ DỊCH VỤ TOUR (CÓ BADGE NCC & VAT SELECT)*/}
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

          {/* Quick Actions Bar for Tax & Bulk Overrides */}
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">
                Tác vụ nhanh thuế Mục I:
              </span>
              <Button
                size="small"
                type="dashed"
                className="text-xs font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                onClick={() => handleBulkApplyVat(8)}
              >
                Áp dụng VAT 8% cho Mục I
              </Button>
              <Button
                size="small"
                type="dashed"
                className="text-xs font-medium text-slate-700 border-slate-300 hover:bg-slate-100"
                onClick={() => handleBulkApplyVat(10)}
              >
                Áp dụng VAT 10%
              </Button>
              <Button
                size="small"
                type="dashed"
                className="text-xs font-medium text-slate-700 border-slate-300 hover:bg-slate-100"
                onClick={() => handleBulkApplyVat(0)}
              >
                Áp dụng VAT 0%
              </Button>
            </div>

            {hasPendingVatChanges && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Có mức thuế đã thay đổi chưa lưu
                </span>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  loading={isSavingChanges}
                  onClick={handleSaveVatChanges}
                  className="bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
                >
                  Lưu thay đổi thuế
                </Button>
              </div>
            )}
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
                  <th className="py-2.5 px-3 text-left min-w-[220px] font-bold">
                    Nhà cung cấp & Trạng thái nhận diện
                  </th>
                  <th className="py-2.5 px-2 text-center w-14 font-bold">SL</th>
                  <th className="py-2.5 px-2 text-center w-24 font-bold">
                    ĐVT
                  </th>
                  <th className="py-2.5 px-3 text-right w-28 font-bold">
                    Đơn giá (VNĐ)
                  </th>
                  <th className="py-2.5 px-2 text-center w-28 font-bold">
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
                      const isVatOverridden =
                        vatOverrides[row.id] !== undefined;

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isError
                              ? "bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500"
                              : isWarning
                                ? "bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500"
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
                            {editingLineId === row.id ? (
                              <div className="flex items-center gap-1.5 min-w-[200px]">
                                <Input
                                  size="small"
                                  value={editingDescription}
                                  autoFocus
                                  placeholder="Nhập tên dịch vụ..."
                                  onChange={(e) =>
                                    setEditingDescription(e.target.value)
                                  }
                                  onPressEnter={() =>
                                    handleSaveDescription(Number(row.stt) - 1)
                                  }
                                  className="text-xs"
                                />
                                <Button
                                  size="small"
                                  type="primary"
                                  className="bg-emerald-700 text-xs px-2"
                                  onClick={() =>
                                    handleSaveDescription(Number(row.stt) - 1)
                                  }
                                >
                                  Lưu
                                </Button>
                                <Button
                                  size="small"
                                  className="text-xs px-2"
                                  onClick={() => setEditingLineId(null)}
                                >
                                  Hủy
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1 group">
                                {row.content ? (
                                  <span>{row.content}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                                    ⚠️ Thiếu tên dịch vụ
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartEditDescription(
                                      row.id,
                                      row.content || "",
                                    )
                                  }
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-700 p-0.5 transition-opacity cursor-pointer"
                                  title="Chỉnh sửa tên dịch vụ"
                                >
                                  <EditOutlined className="text-xs" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Nhà cung cấp & Nhận diện tự động */}
                          <td className="py-2 px-3 text-slate-600 text-xs">
                            {row.supplier && row.supplier !== "Tự do" ? (
                              row.supplierStatus === "EXISTING" ? (
                                <Tag
                                  icon={
                                    <CheckCircleOutlined className="text-[11px]" />
                                  }
                                  className="font-medium text-[11px] rounded-md px-2 py-0.5 border border-[var(--color-primary-300)] bg-[var(--color-primary-soft)] text-[var(--color-primary-900)]"
                                >
                                  {row.supplier} (NCC có sẵn)
                                </Tag>
                              ) : (
                                <Tag
                                  icon={
                                    <PlusCircleOutlined className="text-[11px]" />
                                  }
                                  className="font-medium text-[11px] rounded-md px-2 py-0.5 border border-[var(--color-warning-300)] bg-[var(--color-warning-soft)] text-[var(--color-warning-900)]"
                                >
                                  {row.supplier} (Tạo NCC mới)
                                </Tag>
                              )
                            ) : (
                              <span className="text-slate-400 text-xs">
                                Tự do
                              </span>
                            )}
                          </td>

                          {/* SL */}
                          <td className="py-2 px-2 text-center tabular-nums font-mono font-semibold text-slate-800 text-xs">
                            {row.quantity}
                          </td>

                          {/* ĐVT */}
                          <td className="py-2 px-2 text-center text-slate-600 text-xs">
                            {row.unitText}
                          </td>

                          {/* Đơn giá */}
                          <td className="py-2 px-3 text-right tabular-nums font-mono text-xs">
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

                          {/* VAT (%): Select Dropdown cho phép sửa trực tiếp */}
                          <td className="py-1.5 px-2 text-center tabular-nums font-mono text-xs">
                            <Select
                              size="small"
                              value={vatRateOf(row.vatRate)}
                              onChange={(val) => handleVatChange(row.id, val)}
                              className={`w-20 text-xs tabular-nums font-mono font-semibold ${
                                isVatOverridden
                                  ? "border border-amber-400 rounded"
                                  : ""
                              }`}
                              options={[
                                { value: 0, label: "0%" },
                                { value: 5, label: "5%" },
                                { value: 8, label: "8%" },
                                { value: 10, label: "10%" },
                              ]}
                            />
                          </td>

                          {/* Thành tiền */}
                          <td className="py-2 px-3 text-right tabular-nums font-mono text-xs">
                            {row.totalAmountError ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300 inline-block">
                                {String(row.totalAmount)}
                              </span>
                            ) : (
                              <div>
                                <span className="text-slate-900 font-bold">
                                  {formatVND(row.totalAmount)}
                                </span>
                                {row.isTamperedFormula &&
                                  row.sourceAmount !== undefined && (
                                    <div
                                      className="text-[10px] text-amber-700 tabular-nums font-mono mt-0.5"
                                      title="Excel ghi số khác với SL × HS × Đơn giá"
                                    >
                                      Excel: {formatVND(row.sourceAmount)}
                                    </div>
                                  )}
                              </div>
                            )}
                          </td>

                          {/* Trạng thái & Thao tác */}
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                {isError ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                    <CloseCircleOutlined className="text-rose-600 text-xs shrink-0" />
                                    <span className="truncate">
                                      {row.statusMessage}
                                    </span>
                                  </span>
                                ) : isWarning ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                    <WarningOutlined className="text-amber-600 text-xs shrink-0" />
                                    <span className="truncate">
                                      {row.statusMessage}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-primary-soft)] text-[var(--color-primary-700)] border border-emerald-200/60">
                                    <CheckCircleOutlined className="text-emerald-500 text-[10px] shrink-0" />
                                    Hợp lệ
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteCostLine(Number(row.stt) - 1)
                                }
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                title="Xóa dòng này khỏi dự toán"
                              >
                                <DeleteOutlined className="text-xs" />
                              </button>
                            </div>
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
      {/* 3. BẢNG 3: BẢNG TỔNG HỢP CHI PHÍ & ĐỐI SOÁT HIỆU QUẢ                      */}
      {/* ========================================================================= */}
      {(activeTab === "ALL" || activeTab === "SUMMARY") && (
        <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-xs overflow-hidden">
          <div className="pb-3 mb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalculatorOutlined className="text-emerald-700 text-sm" />
              <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                Bảng 3: Tổng hợp chi phí & Lợi nhuận gộp
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Lợi nhuận gộp: {formatVND(summary.total.grossProfit)} đ (
                {summary.profitMargin})
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
                    Doanh thu
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold">DT thuần</th>
                  <th className="py-2.5 px-3 text-right font-bold">Chi phí</th>
                  <th className="py-2.5 px-3 text-right font-bold">
                    Chi phí thuần
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold">
                    Lợi nhuận gộp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    Dịch vụ 10%
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
                    Dịch vụ 0%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service0.customerRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatVND(summary.service0.netRevenue)}
                  </td>
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
                    TỔNG CỘNG
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
      {/* 🔴 THẺ 3: ĐỐI SOÁT TÀI CHÍNH & SỨC KHỎE DỰ TOÁN (RECONCILIATION CARD)       */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-emerald-700 text-base" />
            <h3 className="text-sm font-bold text-slate-900 mb-0 uppercase tracking-tight">
              Thẻ 3: Đối soát tài chính & Sức khỏe dự toán
            </h3>
          </div>
          <div>
            {currentReconciliation.status === "MATCHED" && (
              <Tag
                icon={<CheckCircleOutlined className="text-emerald-600" />}
                className="font-bold text-xs px-3 py-1 rounded-full m-0 border border-emerald-300 bg-[var(--color-primary-soft)] text-[var(--color-primary-900)]"
              >
                Khớp dữ liệu hoàn hảo (Delta &le; 1 đ)
              </Tag>
            )}
            {currentReconciliation.status === "ROUNDING_TOLERANCE" && (
              <Tag
                icon={<CheckCircleOutlined className="text-blue-600" />}
                className="font-bold text-xs px-3 py-1 rounded-full m-0 border border-blue-200 bg-blue-50 text-blue-900"
              >
                Chênh lệch làm tròn cho phép (&le; 1.000 đ)
              </Tag>
            )}
            {currentReconciliation.status === "MISMATCH" && (
              <Tag
                icon={<WarningOutlined className="text-rose-600" />}
                className="font-bold text-xs px-3 py-1 rounded-full m-0 border border-rose-300 bg-rose-50 text-rose-900"
              >
                Phát hiện chênh lệch tài chính (&gt; 1.000 đ)
              </Tag>
            )}
          </div>
        </div>

        {/* Side-by-side reconciliation table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 text-left min-w-[160px]">
                  Chỉ tiêu tài chính
                </th>
                <th className="py-2.5 px-3 text-right min-w-[160px]">
                  Con số trong file Excel (Source)
                </th>
                <th className="py-2.5 px-3 text-right min-w-[160px]">
                  CRM tính toán độc lập
                </th>
                <th className="py-2.5 px-3 text-right min-w-[140px]">
                  Chênh lệch (Delta)
                </th>
                <th className="py-2.5 px-3 text-center w-36">
                  Đánh giá đối soát
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {/* Doanh thu */}
              <tr className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3 font-semibold text-slate-800">
                  Tổng Doanh thu (Gross)
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-medium">
                  {formatVND(sourceSummary.totalRevenue)} đ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold text-emerald-800">
                  {formatVND(currentReconciliation.calculatedRevenue)} đ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold">
                  <span
                    className={
                      currentReconciliation.revenueDelta > 1000
                        ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded"
                        : "text-emerald-700"
                    }
                  >
                    {formatVND(currentReconciliation.revenueDelta)} đ
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  {currentReconciliation.revenueDelta <= 1000 ? (
                    <Tag className="font-semibold text-xs m-0 border border-emerald-300 bg-[var(--color-primary-soft)] text-[var(--color-primary-900)]">
                      Khớp
                    </Tag>
                  ) : (
                    <Tag className="font-bold text-xs m-0 border border-rose-300 bg-rose-50 text-rose-800">
                      Lệch &gt; 1k
                    </Tag>
                  )}
                </td>
              </tr>

              {/* Chi phí */}
              <tr className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3 font-semibold text-slate-800">
                  Tổng Chi phí dịch vụ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-medium">
                  {formatVND(sourceSummary.totalCost)} đ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold text-slate-800">
                  {formatVND(currentReconciliation.calculatedCost)} đ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold">
                  <span
                    className={
                      currentReconciliation.costDelta > 1000
                        ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded"
                        : "text-emerald-700"
                    }
                  >
                    {formatVND(currentReconciliation.costDelta)} đ
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  {currentReconciliation.costDelta <= 1000 ? (
                    <Tag className="font-semibold text-xs m-0 border border-emerald-300 bg-[var(--color-primary-soft)] text-[var(--color-primary-900)]">
                      Khớp
                    </Tag>
                  ) : (
                    <Tag className="font-bold text-xs m-0 border border-rose-300 bg-rose-50 text-rose-800">
                      Lệch &gt; 1k
                    </Tag>
                  )}
                </td>
              </tr>

              {/* Lợi nhuận gộp */}
              <tr className="hover:bg-slate-50/70">
                <td className="py-2.5 px-3 font-semibold text-slate-800">
                  Lợi nhuận gộp
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-medium">
                  {formatVND(sourceSummary.totalProfit)} đ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold text-emerald-700">
                  {formatVND(currentReconciliation.calculatedGrossProfit)} đ
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono font-bold">
                  <span
                    className={
                      currentReconciliation.profitDelta > 1000
                        ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded"
                        : "text-emerald-700"
                    }
                  >
                    {formatVND(currentReconciliation.profitDelta)} đ
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  {currentReconciliation.profitDelta <= 1000 ? (
                    <Tag className="font-semibold text-xs m-0 border border-emerald-300 bg-[var(--color-primary-soft)] text-[var(--color-primary-900)]">
                      Khớp
                    </Tag>
                  ) : (
                    <Tag className="font-bold text-xs m-0 border border-rose-300 bg-rose-50 text-rose-800">
                      Lệch &gt; 1k
                    </Tag>
                  )}
                </td>
              </tr>

              {/* Tỷ suất LN */}
              <tr className="hover:bg-slate-50/70 bg-emerald-50/30 font-semibold">
                <td className="py-2.5 px-3 text-slate-900">
                  Tỷ suất lợi nhuận (%)
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono">
                  {sourceSummary.profitRate
                    ? `${(sourceSummary.profitRate * 100).toFixed(1)}%`
                    : "-"}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono text-emerald-800 font-bold">
                  {currentReconciliation.calculatedProfitMarginPercent.toFixed(1)}
                  %
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-mono text-slate-400">
                  -
                </td>
                <td className="py-2.5 px-3 text-center">
                  <Tag className="font-semibold text-xs m-0 border border-slate-300 bg-[var(--color-surface-muted)] text-slate-700">
                    Tự động
                  </Tag>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Discrepancy warning & Decision radio selector */}
        {currentReconciliation.status === "MISMATCH" && (
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 space-y-3">
            <div className="flex items-start gap-2.5">
              <WarningOutlined className="text-amber-600 text-lg mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-950 mb-0">
                  CẢNH BÁO: Phát hiện chênh lệch tài chính giữa file Excel và CRM
                  (&gt; 1.000 đ)
                </h4>
                <p className="text-[11px] text-amber-900 mb-0">
                  Tổng cộng tính theo từng dòng dịch vụ thực tế khác với con số
                  tóm tắt ghi trong ô Excel. Vui lòng chọn phương án ghi nhận
                  trước khi bấm Xác nhận nhập:
                </p>
                {currentReconciliation.warnings?.length > 0 && (
                  <ul className="text-[11px] text-amber-800 pl-4 list-disc space-y-0.5 mt-1">
                    {currentReconciliation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200">
              <Radio.Group
                value={reconciliationChoice}
                onChange={(e) =>
                  handleReconciliationChoiceChange(e.target.value)
                }
                className="flex flex-col gap-2"
              >
                <Radio
                  value="USE_CALCULATED_ITEMS"
                  className="text-xs font-semibold text-slate-800"
                >
                  <span>
                    <strong>Lấy theo tổng từng dòng thực tế (Khuyến nghị)</strong>{" "}
                    &mdash; CRM sẽ lưu số liệu chuẩn xác tính từ từng dịch vụ cấu
                    thành tour.
                  </span>
                </Radio>
                <Radio
                  value="PRESERVE_EXCEL_SUMMARY"
                  className="text-xs font-semibold text-slate-800"
                >
                  <span>
                    <strong>Giữ nguyên con số tổng trong file Excel</strong>{" "}
                    &mdash; CRM ghi nhận số tổng từ ô tóm tắt của file Excel và
                    lưu chênh lệch vào hồ sơ đối soát.
                  </span>
                </Radio>
              </Radio.Group>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. DỮ LIỆU THÔ EXCEL (8 CỘT GỐC ĐỂ KIỂM TRA LỖI NHẬP)                    */}
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
                <tr className="bg-[var(--color-surface-muted)] text-slate-700 font-semibold border-b border-[var(--color-border)]">
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
                            ? "bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500"
                            : "bg-white hover:bg-slate-50/70"
                        }`}
                      >
                        <td
                          className={`py-2.5 px-3 text-center font-medium ${
                            isError ? "text-rose-600 font-bold" : "text-slate-500"
                          }`}
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
                              <CloseCircleOutlined className="text-rose-500 text-xs" />
                              {row.statusMessage}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-primary-soft)] text-[var(--color-primary-700)] border border-emerald-200/60">
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

          <div className="px-3.5 py-2.5 border-t border-slate-100 bg-[var(--color-surface-muted)]">
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