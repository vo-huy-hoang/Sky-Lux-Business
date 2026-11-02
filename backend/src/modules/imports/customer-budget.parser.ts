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
  note?: string;
  sortOrder: number;
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

export function isCustomerBudgetWorkbook(workbook: xlsx.WorkBook): boolean {
  const sheetName = workbook.SheetNames.find(
    (name) => name.trim() === 'DỰ TOÁN',
  );
  if (!sheetName) return false;
  const sheet = workbook.Sheets[sheetName];
  return (
    text(sheet.A9?.v).toUpperCase().includes('DỰ TRÙ') &&
    text(sheet.A18?.v).toUpperCase() === 'STT'
  );
}

export function parseCustomerBudgetWorkbook(
  workbook: xlsx.WorkBook,
): ParsedCustomerBudgetRow {
  const sheetName = workbook.SheetNames.find(
    (name) => name.trim() === 'DỰ TOÁN',
  );
  if (!sheetName) throw new Error('Không tìm thấy sheet DỰ TOÁN');
  const sheet = workbook.Sheets[sheetName];
  const cell = (address: string): unknown => sheet[address]?.v;
  const title = text(cell('D9')) || text(cell('A9')) || 'Dự toán tour';
  const businessLineName = text(cell('H13')) || 'TOUR';
  const marketTypeName = text(cell('H15')) || 'NỘI ĐỊA';
  const { startDate, endDate } = parseDateRange(cell('F11'));
  const tourDuration = text(cell('H11'));
  const startCode = formatDateCode(startDate);
  const code = `${startCode}-${slug(title).slice(0, 30)}`.slice(0, 50);
  const phoneRaw = text(cell('E10')).replace(/\D/g, '');
  const phone = phoneRaw.length === 9 ? `0${phoneRaw}` : phoneRaw;

  const revenueLines: ParsedCustomerBudgetRow['__revenueLines'] = [];
  const revenueDefinitions = [
    ['Người lớn', 'ADULT', 'C12', 'F12'],
    ['Trẻ em 70%', 'CHILD', 'C13', 'F13'],
    ['Trẻ em 50%', 'CHILD', 'C14', 'F14'],
    ['Trẻ em miễn phí', 'CHILD', 'C15', 'F15'],
  ] as const;
  revenueDefinitions.forEach(
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

  const costLines: CustomerBudgetLine[] = [];
  let section: 'I' | 'II' = 'I';
  let categoryName = '';
  // Rows 52 onward contain totals/sign-off text, not cost line items.
  for (let row = 20; row <= 51; row += 1) {
    const prefix = text(cell(`A${row}`));
    const description = text(cell(`B${row}`));
    const rawSupplierName = text(cell(`C${row}`));
    const quantity = number(cell(`D${row}`));
    const multiplier = number(cell(`E${row}`));
    const unitPrice = number(cell(`F${row}`));
    const sourceAmount = number(cell(`G${row}`));
    const progress = text(cell(`H${row}`));

    if (prefix === 'I' || prefix === 'II') {
      section = prefix;
      categoryName = '';
      continue;
    }
    if (isCategoryMarker(prefix) && description) {
      categoryName = description;
      continue;
    }
    if (
      prefix.toUpperCase() === 'TỔNG CỘNG' ||
      description.toUpperCase() === 'TỔNG CỘNG' ||
      description.toUpperCase() === 'NỘI DUNG'
    )
      continue;
    if (unitPrice === undefined && sourceAmount === undefined) continue;

    const safeQuantity = quantity ?? 1;
    const safeMultiplier = multiplier ?? 1;
    const safeUnitPrice =
      unitPrice ?? (sourceAmount ?? 0) / safeQuantity / safeMultiplier;
    const amount =
      sourceAmount ?? safeQuantity * safeMultiplier * safeUnitPrice;
    // Only section I (the numbered VAT cost categories such as 1.1-1.4)
    // contains supplier data. Section II is a list of non-VAT input costs;
    // values in its column C are notes/coverage details, not suppliers.
    const supplierName = section === 'I' && categoryName ? rawSupplierName : '';
    const noteParts = [
      supplierName && `Nhà cung cấp: ${supplierName}`,
      progress && `Tiến độ: ${progress}`,
    ].filter(Boolean);
    costLines.push({
      description: description || '',
      supplierName: supplierName || undefined,
      categoryName: categoryName || undefined,
      serviceCategoryCode: serviceCategoryCode(categoryName, description),
      quantity: safeQuantity,
      multiplier: safeMultiplier,
      unitPrice: safeUnitPrice,
      vatRate: section === 'I' ? 10 : 0,
      sourceAmount: amount,
      note: noteParts.length > 0 ? noteParts.join('; ') : undefined,
      sortOrder: costLines.length,
    });
  }

  return {
    'Mã hồ sơ': code,
    'Tên hồ sơ': title,
    'Mã khách hàng': '',
    'Tên khách hàng': text(cell('C10')),
    'Số điện thoại': phone,
    Email: text(cell('G10')),
    'Ngày sinh nhật': dateValue(cell('I10')),
    'Tuyến đường': text(cell('C11')),
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
      totalRevenue: number(cell('C16')),
      totalProfit: number(cell('C17')),
      profitRate: number(cell('D17')),
      totalCost: number(cell('G52')),
    },
  };
}
