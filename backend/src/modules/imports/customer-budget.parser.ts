import * as xlsx from 'xlsx';

export const CUSTOMER_BUDGET_FORMAT = 'SKYLUX_CUSTOMER_BUDGET';

export interface CustomerBudgetLine {
  description: string;
  supplierName?: string;
  supplierId?: string;
  categoryName?: string;
  serviceCategoryCode?: string;
  quantity: number;
  multiplier: number;
  unitPrice: number;
  vatRate: number;
  sourceAmount: number;
  calculatedAmount?: number;
  isTamperedFormula?: boolean;
  note?: string;
  sortOrder: number;
}

export interface FinancialReconciliation {
  calculatedRevenue: number;
  calculatedCost: number;
  calculatedGrossProfit: number;
  calculatedProfitMarginPercent: number;
  revenueDelta: number;
  costDelta: number;
  profitDelta: number;
  status: 'MATCHED' | 'ROUNDING_TOLERANCE' | 'MISMATCH';
  warnings: string[];
}

export interface CustomerBudgetParseOptions {
  defaultSectionIVatRate?: number;
}

export interface ParsedCustomerBudgetRow {
  'Mã hồ sơ': string;
  'Tên hồ sơ': string;
  'Mã khách hàng': string;
  'Tên khách hàng': string;
  'Số điện thoại': string;
  Email: string;
  'Ngày sinh nhật': string;
  'Tuyến đường': string;
  'Ngày bắt đầu': string;
  'Ngày kết thúc': string;
  tourDuration: string;
  'Mức độ ưu tiên': string;
  __importFormat: typeof CUSTOMER_BUDGET_FORMAT;
  __businessLineCode: string;
  __businessLineName: string;
  __marketTypeCode: string;
  __marketTypeName: string;
  __revenueLines: Array<{
    description: string;
    passengerTypeCode: string;
    quantity: number;
    unitCode: string;
    unitPrice: number;
    vatRate: number;
    sortOrder: number;
  }>;
  __costLines: CustomerBudgetLine[];
  __sourceSummary: {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
    profitRate?: number;
  };
  __financialReconciliation?: FinancialReconciliation;
}

function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value).trim();
  }
  return '';
}

function number(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(text(value).replace(/,/g, ''));
  return Number.isFinite(parsed) && text(value) !== '' ? parsed : undefined;
}

function dateValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const raw = text(value);
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match)
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return raw;
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

function parseDateRange(value: unknown): {
  startDate: string;
  endDate: string;
} {
  const raw = text(value);
  const match = raw.match(
    /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\s*[-–]\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/,
  );
  if (!match) return { startDate: '', endDate: '' };

  const [
    ,
    startDay,
    startMonth,
    explicitStartYear,
    endDay,
    endMonth,
    explicitEndYear,
  ] = match;
  const startMonthNumber = Number(startMonth);
  const endMonthNumber = Number(endMonth);
  const startDayNumber = Number(startDay);
  const endDayNumber = Number(endDay);
  const crossesCalendarYear =
    endMonthNumber < startMonthNumber ||
    (endMonthNumber === startMonthNumber && endDayNumber < startDayNumber);

  // Excel templates commonly write `30/12-02/01/2027`, where the year is
  // attached only to the end date. If the range crosses New Year, the start
  // date belongs to the previous year. Explicit years always take precedence.
  const endYear = explicitEndYear
    ? Number(explicitEndYear)
    : explicitStartYear
      ? Number(explicitStartYear) + (crossesCalendarYear ? 1 : 0)
      : undefined;
  const startYear = explicitStartYear
    ? Number(explicitStartYear)
    : explicitEndYear
      ? Number(explicitEndYear) - (crossesCalendarYear ? 1 : 0)
      : undefined;

  if (!startYear || !endYear) return { startDate: '', endDate: '' };

  return {
    startDate: `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`,
    endDate: `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`,
  };
}

function formatDateCode(dateStr: string): string {
  if (!dateStr) return 'IMPORT';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const shortYear = year.slice(-2);
    return `${day.padStart(2, '0')}${month.padStart(2, '0')}${shortYear}`;
  }
  return dateStr.replace(/\D/g, '').slice(0, 6) || 'IMPORT';
}

function serviceCategoryCode(
  categoryName: string,
  description: string,
): string {
  const value = `${categoryName} ${description}`.toUpperCase();
  if (value.includes('VÉ THAM QUAN')) return 'ENTRANCE_FEE';
  if (value.includes('KHÁCH SẠN')) return 'HOTEL';
  if (value.includes('ĂN UỐNG')) return 'RESTAURANT';
  if (value.includes('VẬN CHUYỂN')) return 'TRANSPORT';
  if (value.includes('HƯỚNG DẪN')) return 'GUIDE';
  if (value.includes('BẢO HIỂM')) return 'VISA_INSURANCE';
  return 'OTHER';
}

function businessLineCode(value: string, marketType: string): string {
  const normalizedValue = value.toUpperCase();
  const normalizedMarketType = marketType.toUpperCase();

  // The Excel template stores the business line and market type separately.
  // Do not let a market type such as INBOUND overwrite an explicit line such
  // as SỰ KIỆN.
  if (normalizedValue.includes('SỰ KIỆN') || normalizedValue.includes('MICE')) {
    return 'MICE';
  }
  if (normalizedValue.includes('VÉ')) {
    return 'TICKET_VISA';
  }

  if (normalizedMarketType.includes('OUTBOUND')) return 'TOUR_OUTBOUND';
  if (normalizedMarketType.includes('INBOUND')) return 'TOUR_INBOUND';
  return 'TOUR_DOMESTIC';
}

function marketTypeCode(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes('CHÂU ÂU') || normalized.includes('EU')) {
    return 'INBOUND_EU';
  }
  if (normalized.includes('BẮC MỸ') || normalized.includes('US')) {
    return 'INBOUND_US';
  }
  if (normalized.includes('CHÂU Á') || normalized.includes('ASIA')) {
    return 'INBOUND_ASIA';
  }
  if (normalized.includes('OUTBOUND') || normalized.includes('QUỐC TẾ')) {
    return 'OUTBOUND';
  }
  if (normalized.includes('INBOUND')) return 'INBOUND';
  return 'DOMESTIC';
}

function isCategoryMarker(value: unknown): boolean {
  return /^\d+\.\d+$/.test(text(value));
}

export function findCustomerBudgetSheet(
  workbook: xlsx.WorkBook,
): string | undefined {
  // 1. Direct name match (case & diacritic tolerant)
  for (const name of workbook.SheetNames) {
    const s = slug(name);
    if (
      s.includes('DU-TOAN') ||
      s.includes('DU-TRU') ||
      s.includes('BUDGET') ||
      s.includes('CHI-PHI')
    ) {
      return name;
    }
  }

  // 2. Content-based scan across sheets: check for characteristic budget markers
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet && checkSheetHasBudgetMarkers(sheet)) {
      return name;
    }
  }

  return undefined;
}

function checkSheetHasBudgetMarkers(sheet: xlsx.WorkSheet): boolean {
  if (!sheet) return false;
  let hasTitleMarker = false;
  let hasSTTMarker = false;

  const range = sheet['!ref']
    ? xlsx.utils.decode_range(sheet['!ref'])
    : { s: { r: 0, c: 0 }, e: { r: 50, c: 20 } };
  const maxRow = Math.min(range.e.r, 35);

  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      const cellVal = text(sheet[addr]?.v).toUpperCase();
      if (cellVal.includes('DỰ TRÙ') || cellVal.includes('DỰ TOÁN')) {
        hasTitleMarker = true;
      }
      if (cellVal === 'STT' || cellVal === 'STT.') {
        hasSTTMarker = true;
      }
      if (hasTitleMarker && hasSTTMarker) return true;
    }
  }
  return hasTitleMarker && hasSTTMarker;
}

export function looksLikeCustomerBudgetWorkbook(
  workbook: xlsx.WorkBook,
): boolean {
  for (const name of workbook.SheetNames) {
    const s = slug(name);
    if (
      s.includes('DU-TOAN') ||
      s.includes('DU-TRU') ||
      s.includes('BUDGET') ||
      s.includes('CHI-PHI')
    ) {
      return true;
    }
  }

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const range = sheet['!ref']
      ? xlsx.utils.decode_range(sheet['!ref'])
      : { s: { r: 0, c: 0 }, e: { r: 50, c: 20 } };
    const maxRow = Math.min(range.e.r, 35);

    for (let r = 0; r <= maxRow; r++) {
      for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
        const addr = xlsx.utils.encode_cell({ r, c });
        const cellVal = text(sheet[addr]?.v).toUpperCase();
        if (cellVal.includes('DỰ TRÙ') || cellVal.includes('DỰ TOÁN')) {
          return true;
        }
      }
    }
  }
  return false;
}

export function isCustomerBudgetWorkbook(workbook: xlsx.WorkBook): boolean {
  const sheetName = findCustomerBudgetSheet(workbook);
  if (!sheetName) return false;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return false;
  return checkSheetHasBudgetMarkers(sheet);
}

export const EXCEL_VAT_DIVISOR = 1.08;

export function computeFinancialReconciliation(
  revenueLines: Array<{ quantity?: number; unitPrice?: number }> = [],
  costLines: Array<{
    quantity: number;
    multiplier: number;
    unitPrice: number;
    vatRate?: number;
    sourceAmount?: number;
    calculatedAmount?: number;
    isTamperedFormula?: boolean;
    description?: string;
  }> = [],
  sourceSummary?: {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
  },
): FinancialReconciliation {
  const calculatedRevenue = revenueLines.reduce(
    (sum, line) =>
      sum + Number(line.quantity || 1) * Number(line.unitPrice || 0),
    0,
  );

  const calculatedCost = costLines.reduce(
    (sum, line) =>
      sum +
      Number(
        line.calculatedAmount !== undefined
          ? line.calculatedAmount
          : (line.quantity ?? 1) * (line.multiplier ?? 1) * (line.unitPrice ?? 0),
      ),
    0,
  );

  // 1. Vietnamese travel agency net VAT calculation (standard 1.08 divisor)
  const netRevenue = calculatedRevenue / EXCEL_VAT_DIVISOR;
  const netCost = costLines.reduce((sum, line) => {
    const amount = Number(
      line.calculatedAmount !== undefined
        ? line.calculatedAmount
        : (line.quantity ?? 1) * (line.multiplier ?? 1) * (line.unitPrice ?? 0),
    );
    const lineVat = line.vatRate !== undefined ? Number(line.vatRate) : 8;
    return sum + (lineVat > 0 ? amount / EXCEL_VAT_DIVISOR : amount);
  }, 0);
  const netGrossProfit = netRevenue - netCost;
  const netProfitMarginPercent =
    netRevenue > 0
      ? Number(((netGrossProfit / netRevenue) * 100).toFixed(2))
      : 0;

  // 2. Simple gross formula fallback (for non-VAT / flat sheets)
  const grossProfit = calculatedRevenue - calculatedCost;
  const grossProfitMarginPercent =
    calculatedRevenue > 0
      ? Number(((grossProfit / calculatedRevenue) * 100).toFixed(2))
      : 0;

  let calculatedGrossProfit = grossProfit;
  let calculatedProfitMarginPercent = grossProfitMarginPercent;

  const warnings: string[] = [];
  let revenueDelta = 0;
  let costDelta = 0;
  let profitDelta = 0;

  const totalRevenue = sourceSummary?.totalRevenue;
  const totalCost = sourceSummary?.totalCost;
  const totalProfit = sourceSummary?.totalProfit;

  if (totalRevenue !== undefined) {
    revenueDelta = Math.abs(calculatedRevenue - totalRevenue);
    if (revenueDelta > 1000) {
      warnings.push(
        `Chênh lệch doanh thu: Từng dòng tính ra ${calculatedRevenue.toLocaleString('vi-VN')} đ, file Excel ghi ${totalRevenue.toLocaleString('vi-VN')} đ (lệch ${revenueDelta.toLocaleString('vi-VN')} đ)`,
      );
    }
  }

  if (totalCost !== undefined) {
    costDelta = Math.abs(calculatedCost - totalCost);
    if (costDelta > 1000) {
      warnings.push(
        `Chênh lệch chi phí: Từng dòng tính ra ${calculatedCost.toLocaleString('vi-VN')} đ, file Excel ghi ${totalCost.toLocaleString('vi-VN')} đ (lệch ${costDelta.toLocaleString('vi-VN')} đ)`,
      );
    }
  }

  // Detect individual cost line formula tampering
  let hasLineTampering = false;
  costLines.forEach((line, idx) => {
    const lineCalculated =
      line.calculatedAmount ??
      (line.quantity ?? 1) * (line.multiplier ?? 1) * (line.unitPrice ?? 0);
    if (
      line.sourceAmount !== undefined &&
      Math.abs(line.sourceAmount - lineCalculated) > 1000
    ) {
      hasLineTampering = true;
      warnings.push(
        `Dòng chi phí "${line.description || `#${idx + 1}`}" có công thức lệch: Excel ghi ${line.sourceAmount.toLocaleString('vi-VN')} đ, tính độc lập (SL × HS × Đơn giá) là ${lineCalculated.toLocaleString('vi-VN')} đ (lệch ${Math.abs(line.sourceAmount - lineCalculated).toLocaleString('vi-VN')} đ).`,
      );
    }
  });

  if (totalProfit !== undefined) {
    const netDelta = Math.abs(netGrossProfit - totalProfit);
    const grossDelta = Math.abs(grossProfit - totalProfit);
    if (netDelta <= 1000 && netDelta < grossDelta) {
      calculatedGrossProfit = netGrossProfit;
      calculatedProfitMarginPercent = netProfitMarginPercent;
      profitDelta = netDelta;
    } else if (grossDelta <= 1000) {
      calculatedGrossProfit = grossProfit;
      calculatedProfitMarginPercent = grossProfitMarginPercent;
      profitDelta = grossDelta;
    } else {
      if (netDelta < grossDelta) {
        calculatedGrossProfit = netGrossProfit;
        calculatedProfitMarginPercent = netProfitMarginPercent;
        profitDelta = netDelta;
      } else {
        calculatedGrossProfit = grossProfit;
        calculatedProfitMarginPercent = grossProfitMarginPercent;
        profitDelta = grossDelta;
      }
    }

    if (profitDelta > 1000) {
      warnings.push(
        `Chênh lệch lợi nhuận: Hệ thống tính ra ${calculatedGrossProfit.toLocaleString('vi-VN')} đ, file Excel ghi ${totalProfit.toLocaleString('vi-VN')} đ (lệch ${profitDelta.toLocaleString('vi-VN')} đ)`,
      );
    }
  }

  let reconciliationStatus: 'MATCHED' | 'ROUNDING_TOLERANCE' | 'MISMATCH' =
    'MATCHED';
  if (
    revenueDelta > 1000 ||
    costDelta > 1000 ||
    profitDelta > 1000 ||
    hasLineTampering
  ) {
    reconciliationStatus = 'MISMATCH';
  } else if (revenueDelta > 1 || costDelta > 1 || profitDelta > 1) {
    reconciliationStatus = 'ROUNDING_TOLERANCE';
  }

  return {
    calculatedRevenue,
    calculatedCost,
    calculatedGrossProfit,
    calculatedProfitMarginPercent,
    revenueDelta,
    costDelta,
    profitDelta,
    status: reconciliationStatus,
    warnings,
  };
}

export function parseCustomerBudgetWorkbook(
  workbook: xlsx.WorkBook,
  options?: CustomerBudgetParseOptions,
): ParsedCustomerBudgetRow {
  const sheetName = findCustomerBudgetSheet(workbook);
  if (!sheetName) throw new Error('Không tìm thấy sheet Dự toán phù hợp');
  const sheet = workbook.Sheets[sheetName];
  const cell = (address: string): unknown => sheet[address]?.v;

  const range = sheet['!ref']
    ? xlsx.utils.decode_range(sheet['!ref'])
    : { s: { r: 0, c: 0 }, e: { r: 100, c: 20 } };

  // 1. Locate costHeaderRow dynamically by scanning for STT and a description/service column
  let costHeaderRow = -1;
  let colSTT = 0; // A
  let colDesc = 1; // B
  let colSupplier = 2; // C
  let colSupplierIsExplicit = false;
  let colQty = 3; // D
  let colMultiplier = 4; // E
  let colPrice = 5; // F
  let colAmount = 6; // G
  let colProgress = 7; // H
  let colVat: number | undefined;

  let bestRow = -1;
  let bestScore = 0;
  let bestSttCol = 0;

  for (let r = 0; r <= Math.min(range.e.r, 35); r++) {
    let score = 0;
    let candidateSttCol = -1;

    for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      const val = text(sheet[addr]?.v).toUpperCase();
      if (val === 'STT' || val === 'STT.' || val === 'NO' || val === 'NO.') {
        score += 2;
        candidateSttCol = c;
      }
      if (
        val.includes('NỘI DUNG') ||
        val.includes('DIỄN GIẢI') ||
        val.includes('DỊCH VỤ') ||
        val.includes('CHI PHÍ')
      ) {
        score += 2;
      }
      if (val.includes('ĐƠN GIÁ') || val === 'GIÁ') {
        score += 1;
      }
      if (
        val.includes('THÀNH TIỀN') ||
        val.includes('GIÁ TIỀN') ||
        val.includes('SỐ TIỀN')
      ) {
        score += 1;
      }
      if (val === 'SL' || val.includes('SỐ LƯỢNG')) {
        score += 1;
      }
      if (val === 'ĐVT' || val.includes('HỆ SỐ') || val.includes('SỐ NGÀY')) {
        score += 1;
      }
    }

    if (score > bestScore && candidateSttCol !== -1) {
      bestScore = score;
      bestRow = r;
      bestSttCol = candidateSttCol;
    }
  }

  if (bestRow !== -1 && bestScore >= 3) {
    costHeaderRow = bestRow;
    colSTT = bestSttCol;
    // Inspect columns in this header row to map columns dynamically
    for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
      const addr = xlsx.utils.encode_cell({ r: bestRow, c });
      const val = text(sheet[addr]?.v).toUpperCase();
      if (val.includes('NỘI DUNG') || val.includes('DỊCH VỤ')) {
        colDesc = c;
      } else if (val.includes('NHÀ CUNG CẤP') || val.includes('NCC')) {
        colSupplier = c;
        colSupplierIsExplicit = true;
      } else if (val.includes('DIỄN GIẢI')) {
        colSupplier = c;
      } else if (val === 'SL' || val.includes('SỐ LƯỢNG')) colQty = c;
      else if (
        val === 'ĐVT' ||
        val.includes('HỆ SỐ') ||
        val.includes('SỐ NGÀY')
      )
        colMultiplier = c;
      else if (val.includes('ĐƠN GIÁ')) colPrice = c;
      else if (
        val.includes('GIÁ TIỀN') ||
        val.includes('THÀNH TIỀN') ||
        val.includes('SỐ TIỀN')
      )
        colAmount = c;
      else if (val.includes('TIẾN ĐỘ') || val.includes('TRẠNG THÁI'))
        colProgress = c;
      else if (
        val === 'VAT' ||
        val === '% VAT' ||
        val.includes('THUẾ') ||
        val.includes('VAT (%)')
      )
        colVat = c;
    }
  }

  // Fallback: If no row had both STT and description, check if any row had STT alone
  if (costHeaderRow === -1) {
    for (let r = 0; r <= Math.min(range.e.r, 35); r++) {
      for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
        const addr = xlsx.utils.encode_cell({ r, c });
        const val = text(sheet[addr]?.v).toUpperCase();
        if (val === 'STT' || val === 'STT.') {
          costHeaderRow = r;
          colSTT = c;
          break;
        }
      }
      if (costHeaderRow !== -1) break;
    }
  }

  // If still not found, throw clear diagnostic error!
  if (costHeaderRow === -1) {
    throw new Error(
      'Đã nhận diện file Dự toán tour nhưng không tìm thấy dòng tiêu đề [STT, NỘI DUNG/DIỄN GIẢI...] trong 35 dòng đầu tiên. Vui lòng kiểm tra lại cấu trúc bảng chi phí.',
    );
  }

  // 2. Dynamic Metadata Scan in rows 0 to costHeaderRow
  let title = '';
  let customerName = '';
  let phone = '';
  let email = '';
  let dob = '';
  let route = '';
  let startDate = '';
  let endDate = '';
  let tourDuration = '';
  let businessLineName = '';
  let marketTypeName = '';

  for (let r = 0; r < costHeaderRow; r++) {
    for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      const rawVal = sheet[addr]?.v;
      const strVal = text(rawVal);
      const upperVal = strVal.toUpperCase();

      // Title detection
      if (upperVal.includes('DỰ TRÙ') || upperVal.includes('DỰ TOÁN')) {
        const nextCell =
          text(sheet[xlsx.utils.encode_cell({ r, c: c + 3 })]?.v) ||
          text(sheet[xlsx.utils.encode_cell({ r, c: c + 1 })]?.v);
        if (nextCell && !title) {
          title = nextCell;
        } else if (!title) {
          title = strVal;
        }
      }

      // Customer name: Label or value before phone
      if (
        (upperVal.includes('KHÁCH HÀNG') || upperVal.includes('TÊN KH')) &&
        !customerName
      ) {
        customerName =
          text(sheet[xlsx.utils.encode_cell({ r, c: c + 1 })]?.v) ||
          text(sheet[xlsx.utils.encode_cell({ r, c: c + 2 })]?.v);
      }

      // Phone
      const digits = strVal.replace(/\D/g, '');
      if (
        (digits.length === 9 || digits.length === 10) &&
        (strVal.startsWith('0') ||
          digits.length === 9 ||
          upperVal.includes('SĐT') ||
          upperVal.includes('ĐIỆN THOẠI'))
      ) {
        if (!phone) {
          phone = digits.length === 9 ? `0${digits}` : digits;
        }
      }

      // Email
      if (strVal.includes('@') && strVal.includes('.') && !email) {
        email = strVal;
      }

      // Date of birth
      if (rawVal instanceof Date && !dob) {
        dob = dateValue(rawVal);
      }

      // Route
      if (
        (upperVal.includes('TUYẾN') || upperVal.includes('HÀNH TRÌNH')) &&
        !route
      ) {
        route =
          text(sheet[xlsx.utils.encode_cell({ r, c: c + 1 })]?.v) ||
          text(sheet[xlsx.utils.encode_cell({ r, c: c + 2 })]?.v);
      }

      // Date range
      if (!startDate) {
        const parsedRange = parseDateRange(rawVal);
        if (parsedRange.startDate && parsedRange.endDate) {
          startDate = parsedRange.startDate;
          endDate = parsedRange.endDate;
        }
      }

      // Tour duration
      if (
        (upperVal.includes('SỐ NGÀY') || upperVal.includes('THỜI GIAN')) &&
        !tourDuration
      ) {
        const nextVal = text(
          sheet[xlsx.utils.encode_cell({ r, c: c + 1 })]?.v,
        );
        if (nextVal.toLowerCase().includes('ngày')) {
          tourDuration = nextVal;
        }
      } else if (
        strVal.toLowerCase().includes('ngày') &&
        !tourDuration &&
        (strVal.includes('đêm') || /\d+\s*ngày/i.test(strVal))
      ) {
        tourDuration = strVal;
      }

      // Business line
      if (upperVal === 'MẢNG' && !businessLineName) {
        businessLineName = text(
          sheet[xlsx.utils.encode_cell({ r, c: c + 1 })]?.v,
        );
      }

      // Market type
      if (upperVal === 'LOẠI HÌNH' && !marketTypeName) {
        marketTypeName = text(
          sheet[xlsx.utils.encode_cell({ r, c: c + 1 })]?.v,
        );
      }
    }
  }

  // Fallback to legacy fixed positions if not detected by scanner
  title = title || text(cell('D9')) || text(cell('A9')) || 'Dự toán tour';
  customerName = customerName || text(cell('C10'));
  if (!phone) {
    const phoneRaw = text(cell('E10')).replace(/\D/g, '');
    phone = phoneRaw.length === 9 ? `0${phoneRaw}` : phoneRaw;
  }
  email = email || text(cell('G10'));
  dob = dob || dateValue(cell('I10'));
  route = route || text(cell('C11'));
  if (!startDate) {
    const fallbackDates = parseDateRange(cell('F11'));
    startDate = fallbackDates.startDate;
    endDate = fallbackDates.endDate;
  }
  tourDuration = tourDuration || text(cell('H11'));
  businessLineName = businessLineName || text(cell('H13')) || 'TOUR';
  marketTypeName = marketTypeName || text(cell('H15')) || 'NỘI ĐỊA';

  const startCode = formatDateCode(startDate);
  const code = `${startCode}-${slug(title).slice(0, 30)}`.slice(0, 50);

  // 3. Scan Revenue Lines (Adult, Child 70%, Child 50%, Child free)
  const revenueLines: ParsedCustomerBudgetRow['__revenueLines'] = [];
  const revenueDefinitions = [
    {
      label: 'Người lớn',
      code: 'ADULT',
      keywords: ['NGƯỜI LỚN', 'NL'],
      pattern: /NGƯỜI\s*LỚN|\bNL\b/i,
    },
    {
      label: 'Trẻ em 70%',
      code: 'CHILD',
      keywords: ['70%'],
      pattern: /70%/i,
    },
    {
      label: 'Trẻ em 50%',
      code: 'CHILD',
      keywords: ['50%'],
      pattern: /50%/i,
    },
    {
      label: 'Trẻ em miễn phí',
      code: 'CHILD',
      keywords: ['MIỄN PHÍ', 'FREE'],
      pattern: /(?<!\d)0%|MIỄN\s*PHÍ|FREE|EM\s*BÉ/i,
    },
  ];

  let totalRevenue: number | undefined;
  let totalProfit: number | undefined;
  let profitRate: number | undefined;

  for (let r = 0; r < costHeaderRow; r++) {
    let rowText = '';
    const numCells: Array<{ c: number; v: number }> = [];

    for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      const raw = sheet[addr]?.v;
      const str = text(raw).toUpperCase();
      rowText += ' ' + str;
      const num = number(raw);
      if (num !== undefined) {
        numCells.push({ c, v: num });
      }
    }

    // Check revenue lines
    for (const [index, def] of revenueDefinitions.entries()) {
      const isMatch = def.pattern
        ? def.pattern.test(rowText)
        : def.keywords.some((kw) => rowText.includes(kw));
      if (isMatch) {
        if (!revenueLines.some((rl) => rl.description === def.label)) {
          if (numCells.length >= 2) {
            const quantity = numCells[0].v;
            let unitPrice = numCells[1].v;
            if (numCells.length >= 3) {
              const totalCandidate = numCells[numCells.length - 1].v;
              const priceCandidate = numCells
                .slice(1, -1)
                .find(
                  (nc) =>
                    Math.abs(quantity * nc.v - totalCandidate) < 100,
                );
              if (priceCandidate) {
                unitPrice = priceCandidate.v;
              } else {
                const colF = numCells.find((nc) => nc.c === 5);
                if (colF) unitPrice = colF.v;
              }
            } else if (numCells.length === 2) {
              const secondCell = numCells[1];
              // If the second number is in colAmount (or col >= 6), or if quantity > 1 and secondCell is large,
              // it represents Total Amount. Auto-calculate unitPrice = totalAmount / quantity.
              if (
                secondCell.c === colAmount ||
                secondCell.c >= 6 ||
                (quantity > 1 &&
                  secondCell.v > 1000000 &&
                  (colPrice === undefined || secondCell.c > colPrice))
              ) {
                unitPrice =
                  quantity > 0
                    ? Math.round(secondCell.v / quantity)
                    : secondCell.v;
              } else {
                unitPrice = secondCell.v;
              }
            }

            revenueLines.push({
              description: def.label,
              passengerTypeCode: def.code,
              quantity,
              unitCode: 'PAX',
              unitPrice,
              vatRate: 0,
              sortOrder: index,
            });
          }
        }
      }
    }

    // Check summary rows
    if (rowText.includes('TỔNG DOANH THU') && totalRevenue === undefined) {
      if (numCells.length > 0) totalRevenue = numCells[0].v;
    }
    if (rowText.includes('TỔNG LỢI NHUẬN') && totalProfit === undefined) {
      if (numCells.length >= 1) totalProfit = numCells[0].v;
      if (numCells.length >= 2) profitRate = numCells[1].v;
    }
  }

  // Fallback to legacy fixed cells if revenueLines wasn't found by dynamic label scan
  if (revenueLines.length === 0) {
    const legacyDefs = [
      ['Người lớn', 'ADULT', 'C12', 'F12'],
      ['Trẻ em 70%', 'CHILD', 'C13', 'F13'],
      ['Trẻ em 50%', 'CHILD', 'C14', 'F14'],
      ['Trẻ em miễn phí', 'CHILD', 'C15', 'F15'],
    ] as const;
    legacyDefs.forEach(
      ([description, passengerTypeCode, quantityCell, priceCell], index) => {
        const quantity = number(cell(quantityCell));
        const unitPrice = number(cell(priceCell));
        if (quantity !== undefined && unitPrice !== undefined) {
          revenueLines.push({
            description,
            passengerTypeCode,
            quantity,
            unitCode: 'PAX',
            unitPrice,
            vatRate: 0,
            sortOrder: index,
          });
        }
      },
    );
  }

  // 4. Dynamic Cost Lines Parsing & Dynamic Table Boundary
  const costLines: CustomerBudgetLine[] = [];
  let section: 'I' | 'II' = 'I';
  let sectionIVatRate = options?.defaultSectionIVatRate ?? 8;
  let categoryName = '';
  let totalCost: number | undefined;
  let consecutiveEmptyRows = 0;

  // Pre-scan to locate explicit summary row if present in the sheet
  let summaryRowIndex = -1;
  for (let r = costHeaderRow + 1; r <= range.e.r + 5; r++) {
    const p = text(sheet[xlsx.utils.encode_cell({ r, c: colSTT })]?.v).toUpperCase();
    const d = text(sheet[xlsx.utils.encode_cell({ r, c: colDesc })]?.v).toUpperCase();
    if (
      p === 'TỔNG CỘNG' ||
      d === 'TỔNG CỘNG' ||
      p.includes('TỔNG CHI PHÍ') ||
      d.includes('TỔNG CHI PHÍ')
    ) {
      summaryRowIndex = r;
      break;
    }
  }

  for (let r = costHeaderRow + 1; r <= range.e.r + 5; r++) {
    const prefix = text(
      sheet[xlsx.utils.encode_cell({ r, c: colSTT })]?.v,
    );
    const description = text(
      sheet[xlsx.utils.encode_cell({ r, c: colDesc })]?.v,
    );
    const rawSupplierName = text(
      sheet[xlsx.utils.encode_cell({ r, c: colSupplier })]?.v,
    );
    const quantity = number(
      sheet[xlsx.utils.encode_cell({ r, c: colQty })]?.v,
    );
    const multiplier = number(
      sheet[xlsx.utils.encode_cell({ r, c: colMultiplier })]?.v,
    );
    const unitPrice = number(
      sheet[xlsx.utils.encode_cell({ r, c: colPrice })]?.v,
    );
    const sourceAmount = number(
      sheet[xlsx.utils.encode_cell({ r, c: colAmount })]?.v,
    );
    const progress = text(
      sheet[xlsx.utils.encode_cell({ r, c: colProgress })]?.v,
    );

    // Check if row has any meaningful content
    const hasRowContent =
      prefix !== '' ||
      description !== '' ||
      rawSupplierName !== '' ||
      quantity !== undefined ||
      multiplier !== undefined ||
      unitPrice !== undefined ||
      sourceAmount !== undefined;

    if (!hasRowContent) {
      consecutiveEmptyRows++;
      // If there is an explicit summary row ahead, do not prematurely break on template padding
      if (summaryRowIndex !== -1 && r < summaryRowIndex) {
        continue;
      }
      // If no summary row exists ahead, check if Section II is positioned ahead within 25 rows
      if (section === 'I') {
        let hasSectionIIAhead = false;
        for (
          let nextR = r + 1;
          nextR <= Math.min(range.e.r + 5, r + 25);
          nextR++
        ) {
          const np = text(
            sheet[xlsx.utils.encode_cell({ r: nextR, c: colSTT })]?.v,
          ).toUpperCase();
          const nd = text(
            sheet[xlsx.utils.encode_cell({ r: nextR, c: colDesc })]?.v,
          ).toUpperCase();
          if (
            np === 'II' ||
            /KHÔNG\s*(?:CÓ\s*)?VAT/i.test(nd + ' ' + np) ||
            /CHƯA\s*(?:CÓ\s*)?VAT/i.test(nd + ' ' + np)
          ) {
            hasSectionIIAhead = true;
            break;
          }
        }
        if (hasSectionIIAhead) {
          continue;
        }
      }
      if (consecutiveEmptyRows >= 3) {
        break;
      }
      continue;
    }
    consecutiveEmptyRows = 0;

    const upperPrefix = prefix.toUpperCase();
    const upperDesc = description.toUpperCase();

    // Check for summary / End of table
    if (
      upperPrefix === 'TỔNG CỘNG' ||
      upperDesc === 'TỔNG CỘNG' ||
      upperPrefix.includes('TỔNG CHI PHÍ')
    ) {
      totalCost =
        sourceAmount ??
        number(sheet[xlsx.utils.encode_cell({ r, c: 6 })]?.v) ??
        number(sheet[xlsx.utils.encode_cell({ r, c: colAmount })]?.v) ??
        totalCost;
      break;
    }

    // Check Section II first (to avoid 'KHÔNG CÓ VAT' matching 'CÓ VAT')
    if (
      prefix === 'II' ||
      upperPrefix === 'II' ||
      /KHÔNG\s*(?:CÓ\s*)?VAT/i.test(upperDesc + ' ' + upperPrefix) ||
      /CHƯA\s*(?:CÓ\s*)?VAT/i.test(upperDesc + ' ' + upperPrefix)
    ) {
      section = 'II';
      categoryName = '';
      continue;
    }

    if (
      prefix === 'I' ||
      upperPrefix === 'I' ||
      (!/KHÔNG|CHƯA/i.test(upperDesc) && upperDesc.includes('CÓ VAT'))
    ) {
      section = 'I';
      categoryName = '';
      const vatMatch = (description + ' ' + prefix).match(
        /VAT\s*\(?(\d+(?:\.\d+)?)%\)?/i,
      );
      if (vatMatch) {
        sectionIVatRate = Number(vatMatch[1]);
      }
      continue;
    }

    if (isCategoryMarker(prefix) && description) {
      categoryName = description;
      continue;
    }

    if (
      upperPrefix === 'TỔNG CỘNG' ||
      upperDesc === 'TỔNG CỘNG' ||
      upperDesc === 'NỘI DUNG'
    )
      continue;
    if (unitPrice === undefined && sourceAmount === undefined) continue;

    const safeQuantity = quantity ?? 1;
    const safeMultiplier = multiplier ?? 1;
    const safeUnitPrice =
      unitPrice ?? (sourceAmount ?? 0) / safeQuantity / safeMultiplier;
    const calculatedAmount = safeQuantity * safeMultiplier * safeUnitPrice;
    const amount = sourceAmount ?? calculatedAmount;
    const isTamperedFormula =
      sourceAmount !== undefined &&
      Math.abs(sourceAmount - calculatedAmount) > 1000;

    // Determine line VAT rate
    let lineVatRate = section === 'I' ? sectionIVatRate : 0;
    if (colVat !== undefined) {
      const inlineVatRaw = number(
        sheet[xlsx.utils.encode_cell({ r, c: colVat })]?.v,
      );
      if (inlineVatRaw !== undefined) {
        lineVatRate =
          inlineVatRaw <= 1 && inlineVatRaw > 0
            ? inlineVatRaw * 100
            : inlineVatRaw;
      }
    }

    const isSupplier =
      section === 'I'
        ? Boolean(rawSupplierName)
        : colSupplierIsExplicit && Boolean(rawSupplierName);
    const supplierName = isSupplier ? rawSupplierName : '';
    const lineNote =
      !isSupplier && rawSupplierName ? rawSupplierName : undefined;
    const noteParts = [
      lineNote,
      supplierName && `Nhà cung cấp: ${supplierName}`,
      progress && `Tiến độ: ${progress}`,
    ].filter(Boolean);

    const effectiveCategoryName =
      categoryName ||
      (section === 'I' ? 'I. CHI PHÍ CÓ VAT' : 'II. CHI PHÍ KHÔNG CÓ VAT');

    costLines.push({
      description: description || '',
      supplierName: supplierName || undefined,
      categoryName: effectiveCategoryName,
      serviceCategoryCode: serviceCategoryCode(
        effectiveCategoryName,
        description,
      ),
      quantity: safeQuantity,
      multiplier: safeMultiplier,
      unitPrice: safeUnitPrice,
      vatRate: lineVatRate,
      sourceAmount: amount,
      calculatedAmount,
      isTamperedFormula,
      note: noteParts.length > 0 ? noteParts.join('; ') : undefined,
      sortOrder: costLines.length,
    });
  }

  // Summary fallbacks
  totalRevenue = totalRevenue ?? number(cell('C16'));
  totalProfit = totalProfit ?? number(cell('C17'));
  profitRate = profitRate ?? number(cell('D17'));
  totalCost = totalCost ?? number(cell('G52'));

  // 5. Independent Financial Reconciliation
  const financialReconciliation = computeFinancialReconciliation(
    revenueLines,
    costLines,
    { totalRevenue, totalCost, totalProfit },
  );

  return {
    'Mã hồ sơ': code,
    'Tên hồ sơ': title,
    'Mã khách hàng': '',
    'Tên khách hàng': customerName,
    'Số điện thoại': phone,
    Email: email,
    'Ngày sinh nhật': dob,
    'Tuyến đường': route,
    'Ngày bắt đầu': startDate,
    'Ngày kết thúc': endDate,
    tourDuration,
    'Mức độ ưu tiên': 'MEDIUM',
    __importFormat: CUSTOMER_BUDGET_FORMAT,
    __businessLineCode: businessLineCode(businessLineName, marketTypeName),
    __businessLineName: businessLineName,
    __marketTypeCode: marketTypeCode(marketTypeName),
    __marketTypeName: marketTypeName,
    __revenueLines: revenueLines,
    __costLines: costLines,
    __sourceSummary: {
      totalRevenue,
      totalProfit,
      profitRate,
      totalCost,
    },
    __financialReconciliation: financialReconciliation,
  };
}
