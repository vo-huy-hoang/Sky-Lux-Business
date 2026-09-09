'use client';

import React, { useMemo } from 'react';
import { Tag } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { EstimateCostLine } from '@/types/estimate';
import { formatCurrency, parseVatRate } from '../utils';

function formatNumber(num?: number | string) {
  if (num === undefined || num === null) return '-';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  return isNaN(val) ? '-' : val.toLocaleString('vi-VN');
}

export interface CostTableRowItem {
  id: string;
  stt: string;
  content: string;
  explanation: string;
  quantity: number;
  unit: string | number;
  unitPrice: number;
  totalAmount: number;
  isSubHeader?: boolean;
}

export interface CostSubCategory {
  code: string;
  title: string;
  items: CostTableRowItem[];
  subTotal: number;
}

export const DEFAULT_SAMPLE_COST_LINES: CostTableRowItem[] = [
  // 1.1 VÉ THAM QUAN
  { id: 'sample-1', stt: '', content: 'Hội An - Người lớn', explanation: '', quantity: 30, unit: 1, unitPrice: 80000, totalAmount: 2400000 },
  { id: 'sample-2', stt: '', content: 'Hội An Trẻ em', explanation: '', quantity: 4, unit: 1, unitPrice: 60000, totalAmount: 240000 },
  { id: 'sample-3', stt: '', content: 'Đại Nội Huế', explanation: '', quantity: 30, unit: 1, unitPrice: 80000, totalAmount: 2400000 },
  { id: 'sample-4', stt: '', content: 'Bà Nà', explanation: '', quantity: 30, unit: 1, unitPrice: 1150000, totalAmount: 34500000 },
  { id: 'sample-5', stt: '', content: 'Bà Nà Trẻ em', explanation: '', quantity: 4, unit: 1, unitPrice: 950000, totalAmount: 3800000 },

  // 1.2 KHÁCH SẠN
  { id: 'sample-6', stt: '1', content: 'KHÁCH SẠN MƯỜNG THANH', explanation: 'Đà Nẵng', quantity: 15, unit: 1, unitPrice: 1000000, totalAmount: 15000000 },
  { id: 'sample-7', stt: '', content: 'KHÁCH SẠN HƯƠNG GIANG', explanation: 'Huế', quantity: 15, unit: 1, unitPrice: 950000, totalAmount: 14250000 },

  // 1.3 ĂN UỐNG
  { id: 'sample-8', stt: '1', content: 'Trưa ngày 30/07', explanation: 'NH MADAM LÂN', quantity: 30, unit: 1, unitPrice: 200000, totalAmount: 6000000 },
  { id: 'sample-9', stt: '', content: 'Ăn trưa phát sinh 1', explanation: '', quantity: 2, unit: 1, unitPrice: 200001, totalAmount: 400002 },
  { id: 'sample-10', stt: '', content: 'Ăn trưa phát sinh 2', explanation: '', quantity: 2, unit: 1, unitPrice: 200002, totalAmount: 400004 },
  { id: 'sample-11', stt: '', content: 'Tối ngày 30/07', explanation: 'NH CƠM NIÊU VIỆT', quantity: 30, unit: 1, unitPrice: 200000, totalAmount: 6000000 },

  // 1.4 VẬN CHUYỂN
  { id: 'sample-12', stt: '1', content: 'XE 45 CHỖ', explanation: 'TRIỆU BẢO Ý', quantity: 1, unit: 1, unitPrice: 25920000, totalAmount: 25920000 },

  // 1.5 CÁC DỊCH VỤ KHÁC
  { id: 'sample-13', stt: '', content: 'GALA DINNER', explanation: 'MƯỜNG THANH', quantity: 1, unit: 1, unitPrice: 10000000, totalAmount: 10000000 },
  { id: 'sample-14', stt: '', content: 'TEAM BUILDING', explanation: 'DUY HẢI EVENT', quantity: 1, unit: 1, unitPrice: 70000000, totalAmount: 70000000 },
  { id: 'sample-15', stt: '', content: 'HỘI NGHỊ', explanation: 'KS ROYAL', quantity: 1, unit: 1, unitPrice: 5000000, totalAmount: 5000000 },

  // II. CHƯA VAT
  { id: 'sample-16', stt: '1', content: 'Khăn +Nước', explanation: '', quantity: 30, unit: 3, unitPrice: 10000, totalAmount: 900000 },
  { id: 'sample-17', stt: '3', content: 'Hướng dẫn viên du lịch', explanation: '', quantity: 1, unit: 3, unitPrice: 700000, totalAmount: 2100000 },
  { id: 'sample-18', stt: '4', content: 'Băng Rôn', explanation: '', quantity: 1, unit: 1, unitPrice: 500000, totalAmount: 500000 },
  { id: 'sample-19', stt: '5', content: 'Mũ Du Lịch', explanation: '', quantity: 30, unit: 1, unitPrice: 20000, totalAmount: 600000 },
  { id: 'sample-20', stt: '6', content: 'Lưu đêm hdv', explanation: '', quantity: 1, unit: 2, unitPrice: 300000, totalAmount: 600000 },
  { id: 'sample-21', stt: '7', content: 'Bảo hiểm Du lịch trong nước', explanation: '120tr/vụ/ngày', quantity: 30, unit: 1, unitPrice: 5000, totalAmount: 150000 },
];

export function extractExplanation(line: EstimateCostLine): string {
  if (line.supplier?.displayName) return line.supplier.displayName;
  if (line.supplier?.name) return line.supplier.name;
  if (line.note) {
    const matchNcc = line.note.match(/Nhà cung cấp:\s*([^;]+)/i);
    if (matchNcc) return matchNcc[1].trim();
    const matchProgress = line.note.match(/Tiến độ:\s*([^;]+)/i);
    if (matchProgress) return matchProgress[1].trim();
    if (!line.note.includes('Số tiền nguồn')) return line.note;
  }
  return '';
}

export function classifyCategory(line: {
  description?: string;
  serviceCategory?: { name?: string };
}): {
  code: string;
  title: string;
  order: number;
} {
  const desc = (line.description || '').toLowerCase();
  const cat = (line.serviceCategory?.name || '').toLowerCase();

  if (desc.includes('gala') || desc.includes('team building') || desc.includes('hội nghị') || cat.includes('chi phí khác')) {
    return { code: '1.4', title: 'CÁC DỊCH VỤ KHÁC', order: 5 };
  }
  if (desc.includes('vé tham quan') || desc.includes('hội an') || desc.includes('bà nà') || desc.includes('đại nội') || cat.includes('vé tham quan')) {
    return { code: '1.1', title: 'VÉ THAM QUAN', order: 1 };
  }
  if (desc.includes('khách sạn') || desc.includes('mường thanh') || desc.includes('hương giang') || desc.includes('phòng') || cat.includes('khách sạn')) {
    return { code: '1.2', title: 'KHÁCH SẠN', order: 2 };
  }
  if (desc.includes('ăn uống') || desc.includes('madam lân') || desc.includes('cơm niêu') || desc.includes('trưa ngày') || desc.includes('tối ngày') || cat.includes('nhà hàng')) {
    return { code: '1.2b', title: 'ĂN UỐNG', order: 3 };
  }
  if (desc.includes('xe') || desc.includes('vận chuyển') || desc.includes('triệu bảo ý') || cat.includes('vận chuyển')) {
    return { code: '1.3', title: 'VẬN CHUYỂN', order: 4 };
  }
  return { code: '1.4', title: 'CÁC DỊCH VỤ KHÁC', order: 5 };
}

export interface DossierCostTableProps {
  costLines?: EstimateCostLine[];
  className?: string;
}

export function DossierCostTable({ costLines = [], className = '' }: DossierCostTableProps) {
  // Categorize lines into Section I (VAT) and Section II (NO VAT)
  const { vatSections, noVatItems, totalVat, totalNoVat, grandTotal } = useMemo(() => {
    if (costLines.length === 0) {
      // Build from default sample
      const vatMap = new Map<string, { code: string; title: string; order: number; items: CostTableRowItem[] }>();
      const noVatList: CostTableRowItem[] = [];

      DEFAULT_SAMPLE_COST_LINES.forEach((item, idx) => {
        if (idx < 15) {
          let code = '1.1';
          let title = 'VÉ THAM QUAN';
          let order = 1;
          if (idx >= 5 && idx < 7) {
            code = '1.2';
            title = 'KHÁCH SẠN';
            order = 2;
          } else if (idx >= 7 && idx < 11) {
            code = '1.2b';
            title = 'ĂN UỐNG';
            order = 3;
          } else if (idx >= 11 && idx < 12) {
            code = '1.3';
            title = 'VẬN CHUYỂN';
            order = 4;
          } else if (idx >= 12) {
            code = '1.4';
            title = 'CÁC DỊCH VỤ KHÁC';
            order = 5;
          }
          const group = vatMap.get(title) || { code, title, order, items: [] };
          group.items.push(item);
          vatMap.set(title, group);
        } else {
          noVatList.push(item);
        }
      });

      const sections = Array.from(vatMap.values()).sort((a, b) => a.order - b.order).map(sec => ({
        code: sec.code,
        title: sec.title,
        items: sec.items,
        subTotal: sec.items.reduce((sum, it) => sum + it.totalAmount, 0),
      }));

      const tVat = sections.reduce((sum, s) => sum + s.subTotal, 0);
      const tNoVat = noVatList.reduce((sum, it) => sum + it.totalAmount, 0);

      return {
        vatSections: sections,
        noVatItems: noVatList,
        totalVat: tVat,
        totalNoVat: tNoVat,
        grandTotal: tVat + tNoVat,
      };
    }

    // Process dynamic lines from database
    const vatMap = new Map<string, { code: string; title: string; order: number; items: CostTableRowItem[] }>();
    const noVatList: CostTableRowItem[] = [];

    costLines.forEach((line, index) => {
      const isVat = parseVatRate(line.vatRate) > 0;
      const subtotal = (Number(line.quantity) || 0) * (Number(line.multiplier) || 1) * (Number(line.unitPrice) || 0);
      const gross = Number(line.grossAmount) || subtotal;

      const item: CostTableRowItem = {
        id: line.id || `line-${index}`,
        stt: String(index + 1),
        content: line.description || 'Dịch vụ',
        explanation: extractExplanation(line),
        quantity: Number(line.quantity) || 0,
        unit: Number(line.multiplier) || 1,
        unitPrice: Number(line.unitPrice) || 0,
        totalAmount: gross,
      };

      if (isVat) {
        const cat = classifyCategory(line);
        const group = vatMap.get(cat.title) || { code: cat.code, title: cat.title, order: cat.order, items: [] };
        group.items.push(item);
        vatMap.set(cat.title, group);
      } else {
        noVatList.push(item);
      }
    });

    const sections = Array.from(vatMap.values()).sort((a, b) => a.order - b.order).map(sec => ({
      code: sec.code,
      title: sec.title,
      items: sec.items,
      subTotal: sec.items.reduce((sum, it) => sum + it.totalAmount, 0),
    }));

    const tVat = sections.reduce((sum, s) => sum + s.subTotal, 0);
    const tNoVat = noVatList.reduce((sum, it) => sum + it.totalAmount, 0);

    return {
      vatSections: sections,
      noVatItems: noVatList,
      totalVat: tVat,
      totalNoVat: tNoVat,
      grandTotal: tVat + tNoVat,
    };
  }, [costLines]);

  return (
    <div className={`border border-slate-200/90 rounded-2xl bg-white shadow-sm overflow-hidden ${className}`}>
      {/* 1. Header Bar: Title & Summary badges */}
      <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
            <FileExcelOutlined className="text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                Chi phí theo hạng mục (Dự trù mẫu)
              </h3>
              <Tag color="green" className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 bg-emerald-50 text-emerald-700">
                Chuẩn Excel APP
              </Tag>
            </div>
            <p className="text-[11px] text-slate-400 mb-0 mt-0.5">
              Phân loại theo dịch vụ đầu vào có VAT và chưa VAT
            </p>
          </div>
        </div>

        {/* Quick Summary Pill Counters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100/80 text-sky-900 font-medium text-[11px]">
            Có VAT: <span className="font-mono font-bold">{formatCurrency(totalVat)}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100/80 text-amber-900 font-medium text-[11px]">
            Chưa VAT: <span className="font-mono font-bold">{formatCurrency(totalNoVat)}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100/80 text-rose-900 font-bold text-[11px]">
            Tổng chi phí: <span className="font-mono font-bold">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Spreadsheet Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Header Row */}
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold text-[11px] uppercase tracking-wider border-b border-slate-300">
              <th className="py-2.5 px-2 text-center w-10 border-r border-slate-300">STT</th>
              <th className="py-2.5 px-2.5 min-w-[150px] border-r border-slate-300">NỘI DUNG</th>
              <th className="py-2.5 px-2.5 min-w-[120px] border-r border-slate-300">DIỄN GIẢI</th>
              <th className="py-2.5 px-1.5 text-center w-12 border-r border-slate-300">SL</th>
              <th className="py-2.5 px-1.5 text-center w-12 border-r border-slate-300">ĐVT</th>
              <th className="py-2.5 px-2 text-right w-28 border-r border-slate-300">ĐƠN GIÁ</th>
              <th className="py-2.5 px-2.5 text-right w-32">GIÁ TIỀN</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/90 text-slate-800">
            {/* ======================================================== */}
            {/* PHẦN I: DỊCH VỤ ĐẦU VÀO CÓ VAT                          */}
            {/* ======================================================== */}
            <tr className="bg-[#D9EAF7] text-slate-900 font-bold border-y border-sky-300">
              <td className="py-2 px-2 text-center font-bold border-r border-sky-200">I</td>
              <td colSpan={6} className="py-2 px-3 tracking-wide uppercase font-bold text-xs">
                DỊCH VỤ ĐẦU VÀO CÓ VAT
              </td>
            </tr>

            {vatSections.map((sec, secIdx) => (
              <React.Fragment key={sec.title}>
                {/* Subcategory Header Row (1.1 VÉ THAM QUAN, 1.2 KHÁCH SẠN...) */}
                <tr className="bg-[#EAF3FA] text-slate-900 font-semibold border-y border-sky-200/80">
                  <td className="py-1.5 px-2 text-center font-bold text-[11px] text-sky-900 border-r border-slate-300">
                    {sec.code}
                  </td>
                  <td className="py-1.5 px-3 font-bold text-xs text-sky-950 uppercase border-r border-slate-300">
                    {sec.title}
                  </td>
                  <td className="py-1.5 px-3 text-[11px] font-bold text-sky-800 uppercase border-r border-slate-300">
                    {secIdx === 0 ? 'NHÀ CUNG CẤP' : ''}
                  </td>
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td />
                </tr>

                {/* Subcategory Line Items */}
                {sec.items.map((row, rIdx) => (
                  <tr
                    key={row.id || `${sec.title}-${rIdx}`}
                    className="hover:bg-sky-50/40 transition-colors duration-100 bg-white"
                  >
                    <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200">
                      {row.stt}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 text-xs border-r border-slate-200">
                      {row.content}
                    </td>
                    <td className="py-2 px-3 text-slate-700 text-xs border-r border-slate-200">
                      {row.explanation || '-'}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 text-xs border-r border-slate-200">
                      {row.quantity}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600 text-xs border-r border-slate-200">
                      {row.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 text-xs border-r border-slate-200">
                      {formatNumber(row.unitPrice)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatNumber(row.totalAmount)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* ======================================================== */}
            {/* PHẦN II: DỊCH VỤ ĐẦU VÀO CHƯA VAT                        */}
            {/* ======================================================== */}
            <tr className="bg-[#FFF2CC] text-amber-950 font-bold border-y border-amber-300">
              <td className="py-2 px-2 text-center font-bold border-r border-amber-200">II</td>
              <td colSpan={6} className="py-2 px-3 tracking-wide uppercase font-bold text-xs">
                DỊCH VỤ ĐẦU VÀO CHƯA VAT
              </td>
            </tr>

            {noVatItems.map((row, rIdx) => (
              <tr
                key={row.id || `novat-${rIdx}`}
                className="hover:bg-amber-50/40 transition-colors duration-100 bg-white"
              >
                <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200">
                  {row.stt || rIdx + 1}
                </td>
                <td className="py-2 px-3 font-medium text-slate-900 text-xs border-r border-slate-200">
                  {row.content}
                </td>
                <td className="py-2 px-3 text-slate-700 text-xs border-r border-slate-200">
                  {row.explanation || '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 text-xs border-r border-slate-200">
                  {row.quantity}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600 text-xs border-r border-slate-200">
                  {row.unit}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-800 text-xs border-r border-slate-200">
                  {formatNumber(row.unitPrice)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                  {formatNumber(row.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer Row: TỔNG CỘNG */}
          <tfoot>
            <tr className="bg-[#FCE4D6] text-slate-900 font-bold border-t-2 border-slate-400">
              <td colSpan={6} className="py-2.5 px-3 text-center font-extrabold uppercase tracking-wider text-xs border-r border-slate-300">
                TỔNG CỘNG
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm text-slate-950">
                {formatNumber(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Notes */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="italic">* Bảng chiết tính chi phí đầu vào theo định dạng chuẩn file mẫu 1908 DỰ TRÙ - APP.xlsx</span>
        <span className="font-medium text-slate-500">
          Tổng cộng: {vatSections.reduce((acc, s) => acc + s.items.length, 0) + noVatItems.length} hạng mục dịch vụ
        </span>
      </div>
    </div>
  );
}

export default DossierCostTable;
