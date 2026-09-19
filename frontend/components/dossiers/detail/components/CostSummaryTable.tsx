"use client";

import { formatCurrency } from "@/lib/financial-calculations";
import {
  CostSummaryRow,
  calculateCostSummaryRows,
} from "../hooks/useDossierFinancials";

export type { CostSummaryRow };
export { calculateCostSummaryRows };

export interface CostSummaryTableProps {
  rows: CostSummaryRow[];
  className?: string;
  currency?: string;
}

export function CostSummaryTable({
  rows,
  className = "",
  currency = "VND",
}: CostSummaryTableProps) {
  const totalRow = rows.find((row) => row.key === "total");
  const marginPercent =
    totalRow && totalRow.revenue > 0
      ? ((totalRow.grossProfit / totalRow.revenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div
      className={`border border-slate-200/90 rounded-2xl p-4 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
          Tổng hợp doanh thu và lợi nhuận gộp
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
        <table className="w-full table-fixed text-xs border-collapse">
          <caption className="pb-2 text-left text-[11px] text-slate-500">
            Công thức khớp file Excel: nhóm có VAT chia 1,08; nhóm chưa VAT giữ
            nguyên.
          </caption>
          <thead>
            <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <th className="py-2 px-2 text-left font-bold w-[18%] whitespace-nowrap">
                Hạng mục
              </th>
              <th className="py-2 px-2 text-right font-bold w-[14%] whitespace-nowrap">
                Doanh thu
              </th>
              <th className="py-2 px-2 text-right font-bold w-[14%] whitespace-nowrap">
                DT thuần
              </th>
              <th className="py-2 px-2 text-right font-bold w-[14%] whitespace-nowrap">
                Chi phí
              </th>
              <th className="py-2 px-2 text-right font-bold w-[18%] whitespace-nowrap">
                Chi phí thuần
              </th>
              <th className="py-2 px-2 text-right font-bold w-[22%] whitespace-nowrap">
                Lợi nhuận gộp
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
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs whitespace-nowrap">
                    {formatCurrency(row.grossRevenue ?? row.revenue, currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs whitespace-nowrap">
                    {formatCurrency(row.revenue, currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs whitespace-nowrap">
                    {formatCurrency(row.grossCost ?? row.cost, currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs whitespace-nowrap">
                    {formatCurrency(row.cost, currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs whitespace-nowrap">
                    <span
                      className={
                        row.grossProfit < 0
                          ? "text-red-600 font-semibold"
                          : isTotal
                            ? "text-slate-950 font-extrabold"
                            : "text-slate-900 font-semibold"
                      }
                    >
                      {formatCurrency(row.grossProfit, currency)}
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
