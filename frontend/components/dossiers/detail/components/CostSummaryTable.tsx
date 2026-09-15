"use client";

import React from "react";
import { EstimateCostLine } from "@/types/estimate";
import { formatSummaryCurrency, parseVatRate } from "../utils";

export interface CostSummaryRow {
  key: string;
  label: string;
  customerRevenue: number;
  netRevenue: number;
  cost: number;
  netCost: number;
  grossProfit: number;
}

/**
 * Đồng bộ các dòng đối soát với bảng tổng hợp cuối trong file Excel.
 * Nhóm OTHER ở phần có VAT nằm ngoài vùng đối soát, nhưng OTHER ở phần
 * chưa VAT vẫn thuộc vùng G46:G51 và phải được tính vào Dịch vụ 0%.
 */
export function calculateCostSummaryRows(
  costLines: EstimateCostLine[] = [],
  totalRevenue: number = 0,
  netDivisor: number = 1.08,
): CostSummaryRow[] {
  const amountOf = (line: EstimateCostLine) => {
    const gross = Number(line.grossAmount) || 0;
    const subtotal =
      (Number(line.quantity) || 0) *
      (Number(line.multiplier) || 1) *
      (Number(line.unitPrice) || 0);
    return gross || subtotal;
  };

  const service10Cost = costLines
    .filter(
      (line) =>
        parseVatRate(line.vatRate) > 0 &&
        line.serviceCategory?.code !== "OTHER",
    )
    .reduce((sum, line) => sum + amountOf(line), 0);

  const service0Cost = costLines
    .filter((line) => parseVatRate(line.vatRate) === 0)
    .reduce((sum, line) => sum + amountOf(line), 0);

  const service10NetRevenue = Math.round(totalRevenue / netDivisor);
  const service10NetCost = Math.round(service10Cost / netDivisor);
  const service0NetCost = Math.round(service0Cost);

  const rows: CostSummaryRow[] = [
    {
      key: "service-10",
      label: "Dịch vụ 10%",
      customerRevenue: totalRevenue,
      netRevenue: service10NetRevenue,
      cost: service10Cost,
      netCost: service10NetCost,
      grossProfit: service10NetRevenue - service10NetCost,
    },
    {
      key: "service-0",
      label: "Dịch vụ 0%",
      customerRevenue: 0,
      netRevenue: 0,
      cost: service0Cost,
      netCost: service0NetCost,
      grossProfit: -service0NetCost,
    },
  ];

  const totalRow: CostSummaryRow = {
    key: "total",
    label: "TỔNG CỘNG",
    customerRevenue: rows.reduce((sum, row) => sum + row.customerRevenue, 0),
    netRevenue: rows.reduce((sum, row) => sum + row.netRevenue, 0),
    cost: rows.reduce((sum, row) => sum + row.cost, 0),
    netCost: rows.reduce((sum, row) => sum + row.netCost, 0),
    grossProfit: rows.reduce((sum, row) => sum + row.grossProfit, 0),
  };

  return [...rows, totalRow];
}

export interface CostSummaryTableProps {
  rows: CostSummaryRow[];
  className?: string;
}

export function CostSummaryTable({
  rows,
  className = "",
}: CostSummaryTableProps) {
  const totalRow = rows.find((row) => row.key === "total");
  const marginPercent =
    totalRow && totalRow.netRevenue > 0
      ? ((totalRow.grossProfit / totalRow.netRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div
      className={`border border-slate-200/90 rounded-2xl p-4 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
          Tổng hợp doanh thu và lợi nhuận
        </h3>
        {totalRow && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100/80 text-[11px] font-semibold">
            <span className="text-slate-500">Tỷ suất lợi nhuận:</span>
            <span className="font-mono font-extrabold text-xs text-rose-600">
              {marginPercent}%
            </span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <th className="py-2 px-2 text-left font-bold w-[22%]">
                Tổng thu từ KH
              </th>
              <th className="py-2 px-2 text-right font-bold w-[15%]">
                Doanh thu
              </th>
              <th className="py-2 px-2 text-right font-bold w-[15%]">
                DT thuần
              </th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">
                Chi phí
              </th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">
                Chi phí thuần
              </th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">
                Lãi Gộp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.map((row) => {
              const isTotal = row.key === "total";
              return (
                <tr
                  key={row.key}
                  className={`transition-colors ${
                    isTotal
                      ? "bg-amber-100/80 font-bold border-t-2 border-amber-300 text-slate-900"
                      : "hover:bg-slate-50/70 text-slate-700"
                  }`}
                >
                  <td className="py-2.5 px-2">
                    <span
                      className={
                        isTotal
                          ? "font-extrabold text-slate-900 uppercase text-xs"
                          : "font-semibold text-slate-800"
                      }
                    >
                      {row.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {row.customerRevenue
                      ? formatSummaryCurrency(row.customerRevenue)
                      : "-"}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {formatSummaryCurrency(row.netRevenue)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {formatSummaryCurrency(row.cost)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {formatSummaryCurrency(row.netCost)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    <span
                      className={
                        row.grossProfit < 0
                          ? "text-red-600 font-semibold"
                          : isTotal
                            ? "text-slate-950 font-extrabold"
                            : "text-slate-900 font-semibold"
                      }
                    >
                      {formatSummaryCurrency(row.grossProfit)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CostSummaryTable;
