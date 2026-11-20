/**
 * Các tiện ích nghiệp vụ Tour và định dạng tiền tệ chuyên dụng cho Hồ sơ tour (Dossier)
 */

import {
  parseVatRate,
  classifyCostCategory as classifyCategory,
} from '@/lib/estimate-valuation';
import { formatCurrency, formatVndCurrency } from '@/lib/financial-calculations';

export { parseVatRate, classifyCategory, formatCurrency, formatVndCurrency };

function parseDateParts(
  dateStr: string,
): { year: number; month: number; day: number } | null {
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10),
    };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

/**
 * Tính thời lượng tour theo số ngày và số đêm (ví dụ: '5N4D', hoặc '1 ngày (Trong ngày)')
 */
export function calculateTourDuration(
  startDate?: string,
  endDate?: string,
): string {
  if (!startDate || !endDate) return 'Theo lịch trình';
  const pStart = parseDateParts(startDate);
  const pEnd = parseDateParts(endDate);
  if (!pStart || !pEnd) return 'Theo lịch trình';

  const utcStart = Date.UTC(pStart.year, pStart.month, pStart.day);
  const utcEnd = Date.UTC(pEnd.year, pEnd.month, pEnd.day);

  if (utcEnd < utcStart) return 'Theo lịch trình';

  const diffDays = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays <= 1) {
    return '1 ngày (Trong ngày)';
  }
  const nights = diffDays - 1;
  return `${diffDays}N${nights}D`;
}

/**
 * Lấy thứ trong tuần từ chuỗi ngày (vi-VN)
 */
export function getDayOfWeek(dateStr?: string): string {
  if (!dateStr) return 'Chưa xếp';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const days = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];
  return days[d.getDay()];
}

/**
 * Định dạng tiền tệ cho bảng tổng kết tài chính (đồng nhất chuẩn với formatCurrency)
 */
export function formatSummaryCurrency(
  amount: number,
  currency = 'VND',
): string {
  return formatCurrency(amount, currency);
}
