"use client";

import React, { useMemo } from "react";
import { BarChartOutlined } from "@ant-design/icons";
import { EstimateRevenueLine } from "@/types/estimate";
import {
  getWorkbookGrossAmount,
  sumWorkbookGrossAmounts,
} from "@/lib/financial-calculations";
import { calculateTourDuration, formatCurrency } from "../utils";

export interface DossierRevenueTableProps {
  revenueLines?: EstimateRevenueLine[];
  dossier?: any;
  className?: string;
}

export function DossierRevenueTable({
  revenueLines = [],
  dossier,
  className = "",
}: DossierRevenueTableProps) {
  const revenues = useMemo(() => revenueLines || [], [revenueLines]);

  const totalRevenue = useMemo(
    () => sumWorkbookGrossAmounts(revenues),
    [revenues],
  );

  const totalPax = useMemo(() => {
    return revenues.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0),
      0,
    );
  }, [revenues]);

  const tourDurationText = calculateTourDuration(
    dossier?.startDate,
    dossier?.endDate,
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bảng Chi tiết Doanh thu tour */}
      <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-sm overflow-hidden">
        <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChartOutlined className="text-emerald-700 text-sm" />
            <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
              Chi tiết doanh thu
            </h3>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-800">
            Tổng doanh thu: {formatCurrency(totalRevenue)}
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-2 text-center w-12 font-bold">STT</th>
                <th className="py-2.5 px-3 text-left min-w-[160px] font-bold">
                  Hạng mục
                </th>
                <th className="py-2.5 px-3 text-left min-w-[180px] font-bold">
                  Diễn giải
                </th>
                <th className="py-2.5 px-2 text-center w-16 font-bold">ĐVT</th>
                <th className="py-2.5 px-2 text-center w-16 font-bold">SL</th>
                <th className="py-2.5 px-3 text-right w-32 font-bold">
                  Đơn giá
                </th>
                <th className="py-2.5 px-3 text-right w-36 font-bold">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {revenues.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-slate-400 italic"
                  >
                    Chưa có dữ liệu dòng doanh thu
                  </td>
                </tr>
              ) : (
                revenues.map((line, idx) => {
                  const grossAmount = getWorkbookGrossAmount(line);
                  const noteText =
                    line.note ||
                    (tourDurationText === "Theo lịch trình"
                      ? "Gói tour theo chương trình"
                      : `Gói tour ${tourDurationText} theo chương trình`);

                  return (
                    <tr
                      key={line.id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 px-2 text-center font-mono text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 text-xs">
                        {line.description || "Tour trọn gói"}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-xs">
                        {noteText}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600 text-xs">
                        {line.unit?.name || "Khách"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 text-xs">
                        {line.quantity || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 text-xs">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(grossAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {revenues.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-200 text-slate-900">
                  <td
                    colSpan={4}
                    className="py-2.5 px-3 uppercase text-xs text-emerald-900"
                  >
                    TỔNG CỘNG
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-extrabold text-xs text-emerald-900">
                    {totalPax}
                  </td>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-xs text-emerald-900">
                    {formatCurrency(totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 italic">
          * Thành tiền được tính theo công thức Excel: số lượng × hệ số × đơn
          giá
        </div>
      </div>
    </div>
  );
}

export default DossierRevenueTable;
