import { useMemo } from "react";
import {
  FinancialReconciliation,
  ImportRow,
  PaginatedImportRowsResponse,
} from "@/types/import";
import { EXCEL_VAT_DIVISOR } from "@/lib/financial-calculations";

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

function vatRateOf(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "")
    .trim()
    .replace(/%/g, "")
    .replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Tổng hợp khớp công thức trong sheet DỰ TOÁN của file Excel mẫu.
 * Nhóm có VAT chia 1.08; nhóm chưa VAT giữ nguyên.
 */
export function calculateImportSummary(
  revenues: ValidatedLine[] = [],
  costs: ValidatedLine[] = [],
): ImportSummary {
  const totalRevenueGross = revenues.reduce(
    (sum, line) => sum + amountOf(line),
    0,
  );
  const service10CostGross = costs
    // Every VAT cost line belongs to Section I, including uncategorized
    // entries such as Section I.4 ("CÁC DỊCH VỤ KHÁC").
    .filter((line) => vatRateOf(line.vatRate) > 0)
    .reduce((sum, line) => sum + amountOf(line), 0);
  const service0CostGross = costs
    .filter((line) => vatRateOf(line.vatRate) === 0)
    .reduce((sum, line) => sum + amountOf(line), 0);

  const service10Revenue = totalRevenueGross / EXCEL_VAT_DIVISOR;
  const service10Cost = service10CostGross / EXCEL_VAT_DIVISOR;

  const service10: ImportSummaryRow = {
    customerRevenue: totalRevenueGross,
    netRevenue: service10Revenue,
    cost: service10CostGross,
    netCost: service10Cost,
    grossProfit: service10Revenue - service10Cost,
  };
  const service0: ImportSummaryRow = {
    customerRevenue: 0,
    netRevenue: 0,
    cost: service0CostGross,
    netCost: service0CostGross,
    grossProfit: -service0CostGross,
  };
  const total: ImportSummaryRow = {
    customerRevenue: service10.customerRevenue + service0.customerRevenue,
    netRevenue: service10.netRevenue + service0.netRevenue,
    cost: service10.cost + service0.cost,
    netCost: service10.netCost + service0.netCost,
    grossProfit: service10.grossProfit + service0.grossProfit,
  };

  return {
    service10,
    service0,
    total,
    profitMargin:
      total.netRevenue > 0
        ? `${((total.grossProfit / total.netRevenue) * 100).toFixed(1)}%`
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

      metadata = {
        tourName: String(normalized.name || data["Tên hồ sơ"] || data.tourName || "").trim() || "-",
        customerName: String(normalized.customerName || data["Tên khách hàng"] || data.customerName || "").trim() || "-",
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
          (vatRateOf(line.vatRate) < 0 || vatRateOf(line.vatRate) > 100)
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
          vatRateOf(line.vatRate) > 0;

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

      const importSummary = calculateImportSummary(revenues, costs);
      const netGrossProfit = importSummary.total.grossProfit;
      const netProfitMargin =
        importSummary.total.netRevenue > 0
          ? Number(
              ((netGrossProfit / importSummary.total.netRevenue) * 100).toFixed(2),
            )
          : 0;

      const grossProfit = totalRevenue - totalCost;
      const grossProfitMargin =
        totalRevenue > 0
          ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
          : 0;

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
        ? Math.abs(totalRevenue - sourceSummary.totalRevenue)
        : 0;
      const cstDelta = sourceSummary.totalCost
        ? Math.abs(totalCost - sourceSummary.totalCost)
        : 0;

      const hasLineTampering = costs.some((c: any) => c.isTamperedFormula);
      let recStatus: "MATCHED" | "ROUNDING_TOLERANCE" | "MISMATCH" = "MATCHED";
      if (
        revDelta > 1000 ||
        cstDelta > 1000 ||
        prfDelta > 1000 ||
        hasLineTampering
      ) {
        recStatus = "MISMATCH";
      } else if (revDelta > 1 || cstDelta > 1 || prfDelta > 1) {
        recStatus = "ROUNDING_TOLERANCE";
      }

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
        calculatedGrossProfit: calcGrossProfit,
        calculatedProfitMarginPercent: calcProfitMargin,
        revenueDelta: revDelta,
        costDelta: cstDelta,
        profitDelta: prfDelta,
        status: recStatus,
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
