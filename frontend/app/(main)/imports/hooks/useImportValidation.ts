import { useMemo } from "react";
import {
  FinancialReconciliation,
  ImportRow,
  PaginatedImportRowsResponse,
} from "@/types/import";
import {
  parseVatRate,
  valuateEstimate,
  reconcileEstimateValuation,
} from "@/lib/estimate-valuation";

export interface ValidatedLine {
  id: string;
  stt: number | string;
  category?: string;
  content?: string;
  description?: string;
  supplier?: string;
  unit?: string;
  unitText?: string;
  quantity: number;
  multiplier?: number;
  unitPrice: number | string;
  sourceAmount?: number | string;
  unitPriceError?: boolean;
  vatRate: number | string;
  vatRateError?: boolean;
  grossAmount?: number;
  totalAmount?: number | string;
  totalAmountError?: boolean;
  status: "VALID" | "WARNING" | "ERROR";
  statusMessage?: string;
  categoryGroup?: string;
  serviceCategoryCode?: string;
  supplierStatus?: "EXISTING" | "NEW_TO_BE_CREATED";
  isVatSection?: boolean;
  calculatedAmount?: number;
  isTamperedFormula?: boolean;
  isMissingDescription?: boolean;
}

export interface BudgetMetadata {
  tourName: string;
  customerName: string;
  customerCode?: string;
  customerStatus?: "EXISTING" | "NEW_TO_BE_CREATED";
  phone: string;
  email: string;
  route: string;
  startDate: string;
  endDate: string;
  tourDuration: string;
  businessLine: string;
  marketType: string;
}

export interface ImportSummaryRow {
  customerRevenue: number;
  netRevenue: number;
  cost: number;
  netCost: number;
  grossProfit: number;
}

export interface ImportSummary {
  service10: ImportSummaryRow;
  service0: ImportSummaryRow;
  total: ImportSummaryRow;
  profitMargin: string;
}

export interface ImportClassification {
  businessLine: string;
  marketType: string;
}

function classificationLabel(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  if (text === "TOUR_DOMESTIC") return "TOUR";
  if (text === "DOMESTIC") return "NỘI ĐỊA";
  return text;
}

function amountOf(line: ValidatedLine): number {
  const sourceAmount = Number(line.sourceAmount);
  if (Number.isFinite(sourceAmount)) return sourceAmount;

  return (
    Number(line.quantity ?? 0) *
    Number(line.multiplier ?? 1) *
    Number(line.unitPrice ?? 0)
  );
}

/**
 * Tổng hợp khớp công thức trong sheet DỰ TOÁN của file Excel mẫu.
 * Nhóm có VAT chia 1.08; nhóm chưa VAT giữ nguyên.
 */
export function calculateImportSummary(
  revenues: ValidatedLine[] = [],
  costs: ValidatedLine[] = [],
): ImportSummary {
  const valuation = valuateEstimate(revenues, costs);

  const service10: ImportSummaryRow = {
    customerRevenue: valuation.revenueGross,
    netRevenue: valuation.revenueNet,
    cost: valuation.costVatGross,
    netCost: valuation.costVatNet,
    grossProfit: valuation.revenueNet - valuation.costVatNet,
  };
  const service0: ImportSummaryRow = {
    customerRevenue: 0,
    netRevenue: 0,
    cost: valuation.costNoVatGross,
    netCost: valuation.costNoVatGross,
    grossProfit: -valuation.costNoVatGross,
  };
  const total: ImportSummaryRow = {
    customerRevenue: valuation.revenueGross,
    netRevenue: valuation.revenueNet,
    cost: valuation.costGross,
    netCost: valuation.costNet,
    grossProfit: valuation.profitExact,
  };

  return {
    service10,
    service0,
    total,
    profitMargin:
      valuation.revenueNet > 0
        ? `${((valuation.profitExact / valuation.revenueNet) * 100).toFixed(1)}%`
        : "0%",
  };
}

export function useImportValidation(previewData?: PaginatedImportRowsResponse) {
  return useMemo(() => {
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let totalCount = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalPax = 0;
    let classification: ImportClassification = {
      businessLine: "-",
      marketType: "-",
    };

    let rawRow: ImportRow | undefined = undefined;
    let isCustomerBudget = false;
    let metadata: BudgetMetadata = {
      tourName: "-",
      customerName: "-",
      phone: "-",
      email: "-",
      route: "-",
      startDate: "-",
      endDate: "-",
      tourDuration: "-",
      businessLine: "-",
      marketType: "-",
    };
    let financialReconciliation: FinancialReconciliation = {
      calculatedRevenue: 0,
      calculatedCost: 0,
      calculatedGrossProfit: 0,
      calculatedProfitMarginPercent: 0,
      revenueDelta: 0,
      costDelta: 0,
      profitDelta: 0,
      status: "MATCHED",
      warnings: [],
    };
    const supplierResolutionMap = new Map<string, "EXISTING" | "NEW_TO_BE_CREATED">();

    const revenues: ValidatedLine[] = [];
    const costs: ValidatedLine[] = [];
    let sourceSummary = {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitRate: 0,
    };

    if (previewData?.data && previewData.data.length > 0) {
      rawRow = previewData.data[0];
      const normalized = (rawRow.normalizedData as Record<string, any>) || {};
      const data = rawRow.rawData || {};

      isCustomerBudget =
        data.__importFormat === "SKYLUX_CUSTOMER_BUDGET" ||
        normalized.importFormat === "SKYLUX_CUSTOMER_BUDGET";

      if (Array.isArray(normalized.supplierResolution)) {
        normalized.supplierResolution.forEach((s: any) => {
          if (s && s.name) {
            supplierResolutionMap.set(String(s.name).trim().toLowerCase(), s.status);
          }
        });
      }

      classification = {
        businessLine: classificationLabel(
          normalized.businessLineName || data.__businessLineName || data["MẢNG"] || data.__businessLineCode,
          "-",
        ),
        marketType: classificationLabel(
          normalized.marketTypeName || data.__marketTypeName || data["LOẠI HÌNH"] || data.__marketTypeCode,
          "-",
        ),
      };

      const rawCustomerStatus =
        normalized.customerStatus ||
        normalized.customerResolution?.status ||
        (normalized.customerId ? "EXISTING" : "NEW_TO_BE_CREATED");

      metadata = {
        tourName: String(normalized.name || data["Tên hồ sơ"] || data.tourName || "").trim() || "-",
        customerName: String(normalized.customerName || data["Tên khách hàng"] || data.customerName || "").trim() || "-",
        customerCode: String(normalized.customerCode || data["Mã khách hàng"] || data.customerCode || "").trim() || undefined,
        customerStatus: rawCustomerStatus,
        phone: String(normalized.phone || data["Số điện thoại"] || data["Số ĐT"] || data.phone || "").trim() || "-",
        email: String(normalized.email || data["Email"] || data.email || "").trim() || "-",
        route: String(normalized.route || data["Tuyến đường"] || data.route || "").trim() || "-",
        startDate: String(normalized.startDate || data["Ngày bắt đầu"] || data.startDate || "").trim() || "-",
        endDate: String(normalized.endDate || data["Ngày kết thúc"] || data.endDate || "").trim() || "-",
        tourDuration: String(normalized.tourDuration || data["Thời gian"] || data.tourDuration || "").trim() || "-",
        businessLine: classification.businessLine,
        marketType: classification.marketType,
      };

      const rawRevenues = normalized.revenueLines || data.__revenueLines || [];
      const rawCosts = normalized.costLines || data.__costLines || [];
      sourceSummary = normalized.sourceSummary || data.__sourceSummary || sourceSummary;

      rawRevenues.forEach((line: any, idx: number) => {
        let status: "VALID" | "WARNING" | "ERROR" = "VALID";
        let statusMessage = "";

        if (line.unitPrice < 0) {
          status = "ERROR";
          statusMessage = "Đơn giá không hợp lệ";
        } else if (line.quantity < 0) {
          status = "ERROR";
          statusMessage = "Số lượng không hợp lệ";
        } else if (line.passengerTypeCode === "CHILD" && line.unitPrice > 0) {
          status = "WARNING";
          statusMessage = "Cần kiểm tra giấy khai sinh trẻ em";
        }

        if (status === "VALID") validCount++;
        else if (status === "WARNING") warningCount++;
        else if (status === "ERROR") errorCount++;
        totalCount++;

        const multiplier = line.multiplier ?? 1;
        const grossAmount =
          (line.quantity || 0) * multiplier * (line.unitPrice || 0);
        totalRevenue += grossAmount;
        totalPax += line.quantity || 0;

        revenues.push({
          id: `rev-${idx}`,
          stt: idx + 1,
          category: line.description || "Doanh thu",
          description: line.description,
          unit: line.unitCode || "PAX",
          quantity: line.quantity || 0,
          multiplier,
          unitPrice: line.unitPrice || 0,
          vatRate: line.vatRate || 0,
          grossAmount,
          totalAmount: grossAmount,
          status,
          statusMessage,
        });
      });

      rawCosts.forEach((line: any, idx: number) => {
        let status: "VALID" | "WARNING" | "ERROR" = "VALID";
        let statusMessage = "";
        let unitPriceError = false;
        let vatRateError = false;
        let totalAmountError = false;

        const safeQuantity = line.quantity ?? 1;
        const safeMultiplier = line.multiplier ?? 1;
        const sourceAmount = Number(line.sourceAmount);
        const hasSourceAmount = Number.isFinite(sourceAmount);
        const rawUnitPrice = Number(line.unitPrice);
        const hasUnitPrice = Number.isFinite(rawUnitPrice);
        const calcPrice =
          line.unitPrice === undefined ||
          (hasSourceAmount && rawUnitPrice === 0 && sourceAmount !== 0)
            ? (hasSourceAmount ? sourceAmount : 0) /
              safeQuantity /
              safeMultiplier
            : rawUnitPrice;
        const calculatedAmount = safeQuantity * safeMultiplier * calcPrice;
        const isTamperedFormula =
          hasSourceAmount && Math.abs(sourceAmount - calculatedAmount) > 1000;
        const isMissingDescription =
          !line.description || String(line.description).trim() === '';

        if (!hasUnitPrice && !hasSourceAmount) {
          status = "ERROR";
          statusMessage = "Thiếu Đơn giá và Thành tiền";
          unitPriceError = true;
          totalAmountError = true;
        } else if (calcPrice < 0) {
          status = "ERROR";
          statusMessage = "Đơn giá không hợp lệ";
          unitPriceError = true;
        } else if (calculatedAmount < 0) {
          status = "ERROR";
          statusMessage = "Thành tiền không hợp lệ";
          totalAmountError = true;
        } else if (
          line.vatRate !== undefined &&
          (parseVatRate(line.vatRate) < 0 || parseVatRate(line.vatRate) > 100)
        ) {
          status = "ERROR";
          statusMessage = "VAT không hợp lệ";
          vatRateError = true;
        } else if (isMissingDescription) {
          status = "WARNING";
          statusMessage = "Thiếu tên dịch vụ (Vui lòng điền tên hoặc xóa dòng)";
        } else if (isTamperedFormula) {
          status = "WARNING";
          statusMessage = `Công thức lệch: Excel ghi ${sourceAmount.toLocaleString('vi-VN')} đ, tính đúng là ${calculatedAmount.toLocaleString('vi-VN')} đ`;
        }

        if (status === "VALID") validCount++;
        else if (status === "WARNING") warningCount++;
        else if (status === "ERROR") errorCount++;
        totalCount++;

        totalCost += calculatedAmount;

        const rawSupplier = String(line.supplierName || line.supplier || "").trim();
        const supplierStatus = rawSupplier
          ? supplierResolutionMap.get(rawSupplier.toLowerCase()) || "NEW_TO_BE_CREATED"
          : undefined;
        const groupName = line.categoryName || "DỊCH VỤ";
        const isVatSection =
          /CÓ\s*VAT/i.test(groupName) ||
          parseVatRate(line.vatRate) > 0;

        costs.push({
          id: `cost-${idx}`,
          stt: idx + 1,
          content: line.description ? String(line.description).trim() : "",
          supplier: line.supplierName || "Tự do",
          supplierStatus,
          isVatSection,
          quantity: safeQuantity,
          multiplier: safeMultiplier,
          unitText: "Gói",
          unitPrice: calcPrice,
          sourceAmount: hasSourceAmount ? sourceAmount : undefined,
          calculatedAmount,
          isTamperedFormula,
          isMissingDescription,
          unitPriceError,
          vatRate: line.vatRate || 0,
          vatRateError,
          totalAmount: calculatedAmount,
          totalAmountError,
          status,
          statusMessage,
          categoryGroup: groupName,
          serviceCategoryCode: line.serviceCategoryCode,
        });
      });

      const recon = reconcileEstimateValuation(revenues, costs, sourceSummary);

      const hookWarnings = [
        ...(normalized.financialReconciliation?.warnings ||
          data.__financialReconciliation?.warnings ||
          []),
      ];
      costs.forEach((c: any) => {
        if (c.isMissingDescription) {
          const w = `Dòng #${c.stt} có số tiền ${c.totalAmount.toLocaleString('vi-VN')} đ nhưng chưa có tên dịch vụ.`;
          if (!hookWarnings.includes(w)) hookWarnings.push(w);
        }
        if (c.isTamperedFormula && c.sourceAmount !== undefined) {
          const w = `Dòng "${c.content || `#${c.stt}`}" có công thức lệch: Excel ghi ${c.sourceAmount.toLocaleString('vi-VN')} đ, tính đúng là ${c.totalAmount.toLocaleString('vi-VN')} đ.`;
          if (!hookWarnings.includes(w)) hookWarnings.push(w);
        }
      });

      financialReconciliation = {
        calculatedRevenue: totalRevenue,
        calculatedCost: totalCost,
        calculatedGrossProfit: recon.calculatedProfit,
        calculatedProfitMarginPercent: recon.calculatedMargin,
        revenueDelta: recon.revenueDelta,
        costDelta: recon.costDelta,
        profitDelta: recon.profitDelta,
        status: recon.status,
        warnings: hookWarnings,
      };
    }

    const summary = calculateImportSummary(revenues, costs);

    return {
      validCount,
      errorCount,
      warningCount,
      totalCount,
      revenues,
      costs,
      totalRevenue,
      totalCost,
      totalProfit: summary.total.grossProfit,
      profitMargin: summary.profitMargin,
      totalPax,
      sourceSummary,
      classification,
      summary,
      rawRow,
      isCustomerBudget,
      metadata,
      financialReconciliation,
      supplierResolutionMap,
    };
  }, [previewData]);
}
