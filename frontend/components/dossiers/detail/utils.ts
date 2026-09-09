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

/**
 * Định dạng tiền tệ VND kèm hậu tố 'đ'
 */
export function formatCurrency(amount?: number | string): string {
  if (amount === undefined || amount === null) return '0 đ';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN').format(isNaN(num) ? 0 : num) + ' đ';
}

/**
 * Định dạng tiền tệ rút gọn cho bảng tổng kết tài chính
 */
export function formatSummaryCurrency(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))} đ`;
}
