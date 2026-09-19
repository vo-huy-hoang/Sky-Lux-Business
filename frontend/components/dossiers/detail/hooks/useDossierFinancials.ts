"use client";

import { useMemo } from "react";
import { EstimateItem } from "@/types/estimate";
import {
  EXCEL_VAT_DIVISOR,
  getWorkbookGrossAmount,
  getWorkbookNetAmount,
  sumWorkbookGrossAmounts,
} from "@/lib/financial-calculations";
import { parseVatRate, classifyCategory } from "../utils";

export interface CostSummaryRow {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  grossRevenue?: number;
  grossCost?: number;
  grossProfit: number;
}

/**
 * TICKET-55.1: Tổng hợp khớp công thức trong sheet DỰ TOÁN của file Excel mẫu.
 * Nhóm có VAT chia 1.08; nhóm chưa VAT giữ nguyên.
 */
export function calculateCostSummaryRows(
  costLines: any[] = [],
  totalRevenueGross: number = 0,
): CostSummaryRow[] {
  const taxableRevenue = totalRevenueGross / EXCEL_VAT_DIVISOR;
  const serviceVatGross = costLines
    .filter(
      (line) =>
        parseVatRate(line.vatRate) > 0 && classifyCategory(line).code !== "1.4",
    )
    .reduce((sum, line) => sum + getWorkbookGrossAmount(line), 0);
  const serviceVatCost = serviceVatGross / EXCEL_VAT_DIVISOR;

  const serviceNoVatGross = costLines
    .filter((line) => parseVatRate(line.vatRate) === 0)
    .reduce((sum, line) => sum + getWorkbookGrossAmount(line), 0);
  const serviceNoVatCost = serviceNoVatGross;

  const rows: CostSummaryRow[] = [
    {
      key: "service-vat",
      label: "Dịch vụ 10%",
      revenue: taxableRevenue,
      cost: serviceVatCost,
      grossRevenue: totalRevenueGross,
      grossCost: serviceVatGross,
      grossProfit: taxableRevenue - serviceVatCost,
    },
    {
      key: "service-no-vat",
      label: "Dịch vụ 0%",
      revenue: 0,
      cost: serviceNoVatCost,
      grossRevenue: 0,
      grossCost: serviceNoVatGross,
      grossProfit: -serviceNoVatCost,
    },
  ];

  const totalRow: CostSummaryRow = {
    key: "total",
    label: "TỔNG CỘNG",
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    cost: rows.reduce((sum, row) => sum + row.cost, 0),
    grossRevenue: rows.reduce(
      (sum, row) => sum + (row.grossRevenue ?? row.revenue),
      0,
    ),
    grossCost: rows.reduce((sum, row) => sum + (row.grossCost ?? row.cost), 0),
    grossProfit: rows.reduce((sum, row) => sum + row.grossProfit, 0),
  };

  return [...rows, totalRow];
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
 * theo chuẩn công thức kế toán Sky-Lux (thuế VAT 8% Excel divisor và quy tắc phân loại nhóm 1.4).
 */
export function useDossierFinancials(
  estimate?: EstimateItem | null,
): DossierFinancialSummary {
  return useMemo(() => {
    const revenueGross = sumWorkbookGrossAmounts(estimate?.revenueLines || []);
    const revenue = revenueGross / EXCEL_VAT_DIVISOR;

    const cost = (estimate?.costLines || []).reduce(
      (sum: number, line: any) =>
        sum +
        (parseVatRate(line.vatRate) > 0 && classifyCategory(line).code === "1.4"
          ? 0
          : getWorkbookNetAmount(line, parseVatRate(line.vatRate) > 0)),
      0,
    );

    const profit = revenue - cost;
    const margin = revenue ? ((profit / revenue) * 100).toFixed(2) : "0.00";

    const costSummaryRows = calculateCostSummaryRows(
      estimate?.costLines || [],
      revenueGross,
    );

    return {
      revenueGross,
      revenue,
      cost,
      profit,
      margin,
      costSummaryRows,
    };
  }, [estimate?.revenueLines, estimate?.costLines]);
}

export default useDossierFinancials;
