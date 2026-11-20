"use client";

import { useMemo } from "react";
import { EstimateItem } from "@/types/estimate";
import {
  valuateEstimate,
  buildCostSummaryRows,
  type CostSummaryRow,
  type ValuationLineInput,
} from "@/lib/estimate-valuation";

export type { CostSummaryRow };

/**
 * TICKET-55.1: Tổng hợp khớp công thức trong sheet DỰ TOÁN của file Excel mẫu.
 * Nhóm có VAT chia 1.08; nhóm chưa VAT giữ nguyên.
 */
export function calculateCostSummaryRows(
  costLines: ValuationLineInput[] = [],
  totalRevenueGross: number = 0,
): CostSummaryRow[] {
  return buildCostSummaryRows(costLines, totalRevenueGross);
}

export interface DossierFinancialSummary {
  revenueGross: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: string;
  costSummaryRows: CostSummaryRow[];
}

/**
 * TICKET-51.2 & TICKET-55.1: Hook tính toán tài chính hồ sơ tour memoized
 * Đóng gói toàn bộ logic tính doanh thu, chi phí, lợi nhuận gộp, margin và các hàng tổng hợp chi phí (costSummaryRows)
 * theo chuẩn công thức kế toán Sky-Lux (thuế VAT 8% Excel divisor và toàn bộ nhóm I).
 */
export function useDossierFinancials(
  estimate?: EstimateItem | null,
): DossierFinancialSummary {
  return useMemo(() => {
    const revenueLines = estimate?.revenueLines || [];
    const costLines = estimate?.costLines || [];
    const valuation = valuateEstimate(revenueLines, costLines);
    const costSummaryRows = buildCostSummaryRows(
      costLines,
      valuation.revenueGross,
    );

    return {
      revenueGross: valuation.revenueGross,
      revenue: valuation.revenueNet,
      cost: valuation.costNet,
      profit: valuation.profitExact,
      margin:
        valuation.revenueNet > 0
          ? valuation.marginPercent.toFixed(2)
          : "0.00",
      costSummaryRows,
    };
  }, [estimate?.revenueLines, estimate?.costLines]);
}

export default useDossierFinancials;
