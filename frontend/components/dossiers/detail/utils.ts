/**
 * Các tiện ích nghiệp vụ Tour và định dạng tiền tệ chuyên dụng cho Hồ sơ tour (Dossier)
 */

function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
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
export function calculateTourDuration(startDate?: string, endDate?: string): string {
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
 * Chuẩn hóa và phân tích tỷ lệ thuế VAT từ nhiều định dạng (số thập phân 0.1, số nguyên %, chuỗi '10%')
 * Trả về tỷ lệ thuế dưới dạng số nguyên phần trăm (ví dụ: 10, 8, 0)
 */
export function parseVatRate(vatRate?: number | string | null): number {
  if (vatRate === undefined || vatRate === null) return 0;
  if (typeof vatRate === 'number') {
    if (isNaN(vatRate)) return 0;
    if (vatRate > 0 && vatRate <= 1) {
      return Math.round(vatRate * 100);
    }
    return vatRate > 0 ? vatRate : 0;
  }
  if (typeof vatRate === 'string') {
    const cleanStr = vatRate.replace('%', '').trim();
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || parsed <= 0) return 0;
    if (parsed > 0 && parsed <= 1) {
      return Math.round(parsed * 100);
    }
    return parsed;
  }
  return 0;
}

/**
 * Lấy thứ trong tuần từ chuỗi ngày (vi-VN)
 */
export function getDayOfWeek(dateStr?: string): string {
  if (!dateStr) return 'Chưa xếp';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[d.getDay()];
}

import { formatCurrency, formatVndCurrency } from '@/lib/financial-calculations';

export { formatCurrency, formatVndCurrency };

/**
 * Định dạng tiền tệ cho bảng tổng kết tài chính (đồng nhất chuẩn với formatCurrency)
 */
export function formatSummaryCurrency(amount: number, currency = 'VND'): string {
  return formatCurrency(amount, currency);
}

/**
 * Phân loại tự động các dòng chi phí vào 5 phân nhóm nghiệp vụ:
 * 1.1 VÉ THAM QUAN, 1.2 KHÁCH SẠN, 1.2b ĂN UỐNG, 1.3 VẬN CHUYỂN, 1.4 CÁC DỊCH VỤ KHÁC
 */
export function classifyCategory(line: {
  description?: string;
  serviceCategory?: { name?: string };
  categoryTitle?: string;
}): {
  code: string;
  title: string;
  order: number;
} {
  const explicitCat = (line.categoryTitle || line.serviceCategory?.name || "")
    .toUpperCase()
    .trim();
  if (explicitCat === "VÉ THAM QUAN")
    return { code: "1.1", title: "VÉ THAM QUAN", order: 1 };
  if (explicitCat === "KHÁCH SẠN")
    return { code: "1.2", title: "KHÁCH SẠN", order: 2 };
  if (explicitCat === "ĂN UỐNG")
    return { code: "1.2b", title: "ĂN UỐNG", order: 3 };
  if (explicitCat === "VẬN CHUYỂN")
    return { code: "1.3", title: "VẬN CHUYỂN", order: 4 };
  if (explicitCat === "CÁC DỊCH VỤ KHÁC")
    return { code: "1.4", title: "CÁC DỊCH VỤ KHÁC", order: 5 };

  const desc = (line.description || "").toLowerCase();
  const cat = (line.serviceCategory?.name || "").toLowerCase();

  if (
    desc.includes("gala") ||
    desc.includes("team building") ||
    desc.includes("hội nghị") ||
    cat.includes("chi phí khác")
  ) {
    return { code: "1.4", title: "CÁC DỊCH VỤ KHÁC", order: 5 };
  }
  if (
    desc.includes("vé tham quan") ||
    desc.includes("hội an") ||
    desc.includes("bà nà") ||
    desc.includes("đại nội") ||
    cat.includes("vé tham quan")
  ) {
    return { code: "1.1", title: "VÉ THAM QUAN", order: 1 };
  }
  if (
    desc.includes("khách sạn") ||
    desc.includes("mường thanh") ||
    desc.includes("hương giang") ||
    desc.includes("phòng") ||
    cat.includes("khách sạn")
  ) {
    return { code: "1.2", title: "KHÁCH SẠN", order: 2 };
  }
  if (
    desc.includes("ăn uống") ||
    desc.includes("madam lân") ||
    desc.includes("cơm niêu") ||
    desc.includes("trưa ngày") ||
    desc.includes("tối ngày") ||
    cat.includes("nhà hàng")
  ) {
    return { code: "1.2b", title: "ĂN UỐNG", order: 3 };
  }
  if (
    desc.includes("xe") ||
    desc.includes("vận chuyển") ||
    desc.includes("triệu bảo ý") ||
    cat.includes("vận chuyển")
  ) {
    return { code: "1.3", title: "VẬN CHUYỂN", order: 4 };
  }
  return { code: "1.4", title: "CÁC DỊCH VỤ KHÁC", order: 5 };
}
