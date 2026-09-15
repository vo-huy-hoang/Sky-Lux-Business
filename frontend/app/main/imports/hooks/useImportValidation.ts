import { useMemo } from "react";
import { PaginatedImportRowsResponse } from "@/types/import";

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
  unitPrice: number | string;
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
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  if (text === 'TOUR_DOMESTIC') return 'TOUR';
  if (text === 'DOMESTIC') return 'NỘI ĐỊA';
  return text;
}

function amountOf(line: ValidatedLine): number {
  const importedAmount = Number(line.totalAmount);
  if (Number.isFinite(importedAmount)) return importedAmount;

  return (
    (Number(line.quantity) || 0) *
    (Number(line.unitPrice) || 0)
  );
}

/**
 * Đồng bộ công thức với bảng tổng hợp cuối trong file Excel.
 * Excel đối soát chi phí VAT từ G22:G38 và chi phí chưa VAT từ G46:G51.
 * Vì vậy chỉ loại nhóm OTHER khi dòng thuộc nhóm có VAT; nhóm OTHER trong
 * phần chưa VAT vẫn thuộc vùng G46:G51 và phải được cộng vào Dịch vụ 0%.
 */
export function calculateImportSummary(
  revenues: ValidatedLine[] = [],
  costs: ValidatedLine[] = [],
  netDivisor = 1.08,
): ImportSummary {
  const totalRevenue = revenues.reduce(
    (sum, line) => sum + amountOf(line),
    0,
  );
  const service10Costs = costs
    .filter(
      (line) =>
        Number(line.vatRate) > 0 && line.serviceCategoryCode !== "OTHER",
    )
    .reduce((sum, line) => sum + amountOf(line), 0);
  const service0Costs = costs
    .filter((line) => Number(line.vatRate) === 0)
    .reduce((sum, line) => sum + amountOf(line), 0);

  const service10NetRevenue = Math.round(totalRevenue / netDivisor);
  const service10NetCost = Math.round(service10Costs / netDivisor);

  const service10: ImportSummaryRow = {
    customerRevenue: totalRevenue,
    netRevenue: service10NetRevenue,
    cost: service10Costs,
    netCost: service10NetCost,
    grossProfit: service10NetRevenue - service10NetCost,
  };
  const service0: ImportSummaryRow = {
    customerRevenue: 0,
    netRevenue: 0,
    cost: service0Costs,
    netCost: Math.round(service0Costs),
    grossProfit: -Math.round(service0Costs),
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
      businessLine: '-',
      marketType: '-',
    };

    const revenues: ValidatedLine[] = [];
    const costs: ValidatedLine[] = [];
    let sourceSummary = {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitRate: 0,
    };

    if (previewData?.data && previewData.data.length > 0) {
      const row = previewData.data[0];
      const data = row.rawData || {};

      classification = {
        businessLine: classificationLabel(
          data.__businessLineName || data['MẢNG'] || data.__businessLineCode,
          '-',
        ),
        marketType: classificationLabel(
          data.__marketTypeName || data['LOẠI HÌNH'] || data.__marketTypeCode,
          '-',
        ),
      };

      const rawRevenues = data.__revenueLines || [];
      const rawCosts = data.__costLines || [];
      sourceSummary = data.__sourceSummary || sourceSummary;

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

        const grossAmount = (line.quantity || 0) * (line.unitPrice || 0);
        totalRevenue += grossAmount;
        totalPax += line.quantity || 0;

        revenues.push({
          id: `rev-${idx}`,
          stt: idx + 1,
          category: line.description || "Doanh thu",
          description: line.description,
          unit: line.unitCode || "PAX",
          quantity: line.quantity || 0,
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
        const calcPrice =
          line.unitPrice ??
          (line.sourceAmount ?? 0) / safeQuantity / safeMultiplier;
        const calcAmount =
          line.sourceAmount ?? safeQuantity * safeMultiplier * calcPrice;

        if (
          typeof line.unitPrice !== "number" &&
          typeof line.sourceAmount !== "number"
        ) {
          status = "ERROR";
          statusMessage = "Thiếu Đơn giá và Thành tiền";
          unitPriceError = true;
          totalAmountError = true;
        } else if (calcPrice < 0) {
          status = "ERROR";
          statusMessage = "Đơn giá không hợp lệ";
          unitPriceError = true;
        } else if (calcAmount < 0) {
          status = "ERROR";
          statusMessage = "Thành tiền không hợp lệ";
          totalAmountError = true;
        } else if (
          line.vatRate !== undefined &&
          (line.vatRate < 0 || line.vatRate > 100)
        ) {
          status = "ERROR";
          statusMessage = "VAT không hợp lệ";
          vatRateError = true;
        } else if (!line.description) {
          status = "WARNING";
          statusMessage = "Thiếu diễn giải";
        }

        if (status === "VALID") validCount++;
        else if (status === "WARNING") warningCount++;
        else if (status === "ERROR") errorCount++;
        totalCount++;

        totalCost += calcAmount;

        costs.push({
          id: `cost-${idx}`,
          stt: idx + 1,
          content: line.description || `Dịch vụ dòng ${idx + 1}`,
          supplier: line.supplierName || "Tự do",
          quantity: line.quantity || 1,
          unitText: "Gói",
          unitPrice: calcPrice,
          unitPriceError,
          vatRate: line.vatRate || 0,
          vatRateError,
          totalAmount: calcAmount,
          totalAmountError,
          status,
          statusMessage,
          categoryGroup: line.categoryName || "DỊCH VỤ",
          serviceCategoryCode: line.serviceCategoryCode,
        });
      });
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
    };
  }, [previewData]);
}
