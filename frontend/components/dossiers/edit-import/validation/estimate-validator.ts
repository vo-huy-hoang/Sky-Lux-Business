export interface EditableRevenueRow {
  id: string;
  stt: number;
  description: string;
  quantity: number;
  multiplier: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  note: string;
  status: "VALID" | "WARNING" | "ERROR";
  warningMessage?: string;
}

export interface EditableCostRow {
  id: string;
  stt: number;
  description: string;
  serviceCategoryId?: string;
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  multiplier: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  sourceAmount?: number | null;
  note: string;
  status: "VALID" | "WARNING" | "ERROR";
  warningMessage?: string;
  serviceCategory?: { name?: string };
  categoryTitle?: string;
}

export interface IssueItem {
  id: string;
  rowId: string;
  isCost: boolean;
  rowNumber: number;
  title: string;
  description: string;
  type: "ERROR" | "WARNING";
}

export function calculateCostRowAmount(row: EditableCostRow): number {
  return Number(row.quantity || 0) * Number(row.multiplier || 0) * Number(row.unitPrice || 0);
}

export function calculateRevenueRowAmount(row: EditableRevenueRow): number {
  return Number(row.quantity || 0) * Number(row.multiplier || 0) * Number(row.unitPrice || 0);
}

export interface ValidationResult {
  issues: IssueItem[];
  errorCount: number;
  warningCount: number;
  validatedRevenueRows: EditableRevenueRow[];
  validatedCostRows: EditableCostRow[];
}

/**
 * Pure validation engine for revenue and cost lines in the Estimate Editor.
 * Replaces hardcoded ID checks (c5, c2, r3, idx === 2) with real enterprise data integrity rules.
 * Complexity: O(R + C) linear stream processing.
 */
export function validateEstimateLines(
  revenueRows: EditableRevenueRow[],
  costRows: EditableCostRow[],
): ValidationResult {
  const issues: IssueItem[] = [];

  // 1. Validate Cost Rows
  const validatedCostRows: EditableCostRow[] = costRows.map((c, idx) => {
    const rowNumber = idx + 1;
    let rowStatus: "VALID" | "WARNING" | "ERROR" = "VALID";
    let firstMessage: string | undefined = undefined;

    // Check Errors
    if (!c.description || !c.description.trim()) {
      rowStatus = "ERROR";
      firstMessage = "Mô tả dịch vụ chi phí không được để trống.";
      issues.push({
        id: `cost-desc-${c.id}`,
        rowId: c.id,
        isCost: true,
        rowNumber,
        title: `Dòng ${rowNumber} (Chi phí) - Chưa có mô tả`,
        description: firstMessage,
        type: "ERROR",
      });
    } else if (Number(c.quantity) <= 0) {
      rowStatus = "ERROR";
      firstMessage = "Số lượng dịch vụ phải lớn hơn 0.";
      issues.push({
        id: `cost-qty-${c.id}`,
        rowId: c.id,
        isCost: true,
        rowNumber,
        title: `Dòng ${rowNumber} (Chi phí) - ${c.description}`,
        description: firstMessage,
        type: "ERROR",
      });
    } else if (Number(c.multiplier) <= 0) {
      rowStatus = "ERROR";
      firstMessage = "Hệ số/Số ngày phải lớn hơn 0.";
      issues.push({
        id: `cost-mult-${c.id}`,
        rowId: c.id,
        isCost: true,
        rowNumber,
        title: `Dòng ${rowNumber} (Chi phí) - ${c.description}`,
        description: firstMessage,
        type: "ERROR",
      });
    }

    // Check Warnings (only if not already an error)
    if (rowStatus !== "ERROR") {
      const isExternalService =
        !c.description.toLowerCase().includes("tip") &&
        !c.description.toLowerCase().includes("nội bộ") &&
        !c.description.toLowerCase().includes("công tác phí");

      if (!c.supplierName && !c.supplierId && isExternalService) {
        rowStatus = "WARNING";
        firstMessage = "Chưa chọn nhà cung cấp.";
        issues.push({
          id: `cost-supp-${c.id}`,
          rowId: c.id,
          isCost: true,
          rowNumber,
          title: `Dòng ${rowNumber} (Chi phí) - ${c.description}`,
          description: firstMessage,
          type: "WARNING",
        });
      } else if (Number(c.unitPrice) <= 0) {
        rowStatus = "WARNING";
        firstMessage = "Đơn giá chi phí bằng 0 đ.";
        issues.push({
          id: `cost-price-${c.id}`,
          rowId: c.id,
          isCost: true,
          rowNumber,
          title: `Dòng ${rowNumber} (Chi phí) - ${c.description}`,
          description: firstMessage,
          type: "WARNING",
        });
      } else if (
        c.sourceAmount !== null &&
        c.sourceAmount !== undefined &&
        Math.abs(calculateCostRowAmount(c) - Number(c.sourceAmount)) > 1000
      ) {
        rowStatus = "WARNING";
        firstMessage = "Đơn giá tính toán lệch so với số tiền gốc trong file Excel.";
        issues.push({
          id: `cost-source-${c.id}`,
          rowId: c.id,
          isCost: true,
          rowNumber,
          title: `Dòng ${rowNumber} (Chi phí) - ${c.description}`,
          description: firstMessage,
          type: "WARNING",
        });
      }
    }

    return {
      ...c,
      status: rowStatus,
      warningMessage: firstMessage,
    };
  });

  // 2. Validate Revenue Rows
  const validatedRevenueRows: EditableRevenueRow[] = revenueRows.map((r, idx) => {
    const rowNumber = idx + 1;
    let rowStatus: "VALID" | "WARNING" | "ERROR" = "VALID";
    let firstMessage: string | undefined = undefined;

    // Check Errors
    if (!r.description || !r.description.trim()) {
      rowStatus = "ERROR";
      firstMessage = "Mô tả dịch vụ doanh thu không được để trống.";
      issues.push({
        id: `rev-desc-${r.id}`,
        rowId: r.id,
        isCost: false,
        rowNumber,
        title: `Dòng ${rowNumber} (Doanh thu) - Chưa có mô tả`,
        description: firstMessage,
        type: "ERROR",
      });
    } else if (Number(r.quantity) <= 0) {
      rowStatus = "ERROR";
      firstMessage = "Số lượng khách/dịch vụ phải lớn hơn 0.";
      issues.push({
        id: `rev-qty-${r.id}`,
        rowId: r.id,
        isCost: false,
        rowNumber,
        title: `Dòng ${rowNumber} (Doanh thu) - ${r.description}`,
        description: firstMessage,
        type: "ERROR",
      });
    } else if (Number(r.multiplier) <= 0) {
      rowStatus = "ERROR";
      firstMessage = "Hệ số/Số ngày phải lớn hơn 0.";
      issues.push({
        id: `rev-mult-${r.id}`,
        rowId: r.id,
        isCost: false,
        rowNumber,
        title: `Dòng ${rowNumber} (Doanh thu) - ${r.description}`,
        description: firstMessage,
        type: "ERROR",
      });
    }

    // Check Warnings
    if (rowStatus !== "ERROR") {
      if (Number(r.unitPrice) <= 0) {
        rowStatus = "WARNING";
        firstMessage = "Đơn giá chưa được nhập hoặc bằng 0 đ.";
        issues.push({
          id: `rev-price-${r.id}`,
          rowId: r.id,
          isCost: false,
          rowNumber,
          title: `Dòng ${rowNumber} (Doanh thu) - ${r.description}`,
          description: firstMessage,
          type: "WARNING",
        });
      }
    }

    return {
      ...r,
      status: rowStatus,
      warningMessage: firstMessage,
    };
  });

  // 3. Financial Aggregate Check
  const totalRevenue = revenueRows.reduce(
    (acc, r) => acc + calculateRevenueRowAmount(r),
    0,
  );
  const totalCost = costRows.reduce(
    (acc, c) => acc + calculateCostRowAmount(c),
    0,
  );

  if (totalRevenue > 0 && totalCost > totalRevenue) {
    issues.unshift({
      id: "fin-loss",
      rowId: "global-financial",
      isCost: true,
      rowNumber: 0,
      title: "Tổng tài chính - Chi phí vượt Doanh thu",
      description: "Dự toán đang có chi phí cao hơn doanh thu ròng (lỗ dự kiến).",
      type: "ERROR",
    });
  } else if (totalRevenue > 0 && totalCost > 0) {
    const margin = (totalRevenue - totalCost) / totalRevenue;
    if (margin < 0.1 && margin >= 0) {
      issues.unshift({
        id: "fin-low-margin",
        rowId: "global-financial",
        isCost: false,
        rowNumber: 0,
        title: "Tổng tài chính - Tỷ suất lợi nhuận thấp",
        description: `Tỷ suất lợi nhuận dự kiến là ${(margin * 100).toFixed(1)}% (thấp hơn mức tiêu chuẩn 10%).`,
        type: "WARNING",
      });
    }
  }

  const errorCount = issues.filter((i) => i.type === "ERROR").length;
  const warningCount = issues.filter((i) => i.type === "WARNING").length;

  return {
    issues,
    errorCount,
    warningCount,
    validatedRevenueRows,
    validatedCostRows,
  };
}
