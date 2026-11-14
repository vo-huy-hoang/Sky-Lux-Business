import {
  stripVietnameseDiacritics,
  normalizeCategoryKey,
  getCategoryDisplayName,
} from '@/components/dossiers/edit-import/utils/supplier-category-matcher';

export interface CreateSupplierBatchInput {
  code: string;
  name: string;
  supplierTypeName?: string;
  contactName?: string;
  taxCode?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
}

export interface SupplierImportRow {
  sourceRow: number;
  input: CreateSupplierBatchInput;
}

export interface SupplierImportParseResult {
  fileName: string;
  sheetName: string;
  rows: SupplierImportRow[];
  errors: string[];
  strategyUsed: 'HEADER_BASED' | 'PATTERN_BASED' | 'UNKNOWN';
}

/**
 * Bảng tra cứu tiền tố viết tắt phổ biến sang tên Loại NCC chính xác
 */
export const SUPPLIER_PREFIX_MAP: Record<string, string> = {
  XE: 'Dịch vụ xe',
  NH: 'Nhà hàng',
  VMB: 'Vé máy bay',
  KS: 'Khách sạn',
  VTQ: 'Vé tham quan',
  HDV: 'Hướng dẫn viên',
  BH: 'Bảo hiểm',
};

/**
 * Chuẩn hóa ô Excel thành chuỗi văn bản sạch
 */
export function excelCellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Chuẩn hóa tiêu đề cột Excel: xóa dấu tiếng Việt, chuyển chữ thường, loại ký tự đặc biệt
 */
export function normalizeExcelHeader(value: unknown): string {
  return stripVietnameseDiacritics(String(value ?? ''))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Tách tiền tố và tên nhà cung cấp nếu ô tên có cấu trúc:
 * Ví dụ: "XE - TRIỆU BẢO Ý" -> { name: "TRIỆU BẢO Ý", supplierTypeName: "Dịch vụ xe" }
 *        "NH - MẸT HỘI AN"  -> { name: "MẸT HỘI AN", supplierTypeName: "Nhà hàng" }
 *        "Dịch vụ xe: XE 29" -> { name: "XE 29", supplierTypeName: "Dịch vụ xe" }
 */
export function extractSupplierPrefixAndName(rawName: string): {
  name: string;
  supplierTypeName?: string;
} {
  const clean = excelCellText(rawName);
  if (!clean) return { name: '' };

  // Khớp định dạng: [TIỀN TỐ] [- / : – —] [PHẦN CÒN LẠI]
  const match = clean.match(/^([A-Za-z0-9\u00C0-\u1EF9\s]+?)\s*[-:–—]\s*(.+)$/);
  if (!match) {
    return { name: clean };
  }

  const rawPrefix = match[1].trim();
  const restName = match[2].trim();
  const prefixUpper = rawPrefix.toUpperCase();

  // 1. Kiểm tra bảng viết tắt phổ biến (XE, NH, VMB, KS, VTQ, HDV, BH)
  if (SUPPLIER_PREFIX_MAP[prefixUpper]) {
    return {
      name: restName,
      supplierTypeName: SUPPLIER_PREFIX_MAP[prefixUpper],
    };
  }

  // 2. Kiểm tra nếu tiền tố là từ ngữ đầy đủ (Dịch vụ xe, Nhà hàng, Vé máy bay...)
  const categoryKey = normalizeCategoryKey(rawPrefix);
  if (categoryKey !== 'OTHER') {
    return {
      name: restName,
      supplierTypeName: getCategoryDisplayName(categoryKey),
    };
  }

  // Nếu không thuộc danh mục dịch vụ nhận diện được, giữ nguyên tên ban đầu
  return { name: clean };
}

/**
 * Phân tích ma trận 2D trích xuất từ Excel với Cơ chế Nhận diện 2 Tầng (Dual-Strategy)
 */
export function parseSupplierMatrix(
  matrix: unknown[][],
  options: { fileName?: string; sheetName?: string } = {},
): SupplierImportParseResult {
  const fileName = options.fileName || 'Danh_sach_nha_cung_cap.xlsx';
  const sheetName = options.sheetName || 'Sheet1';
  const rows: SupplierImportRow[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  if (!matrix || matrix.length === 0) {
    return {
      fileName,
      sheetName,
      rows,
      errors: ['Không tìm thấy dữ liệu nhà cung cấp hợp lệ trong sheet đầu tiên'],
      strategyUsed: 'UNKNOWN',
    };
  }

  // =========================================================================
  // CHIẾN LƯỢC 1: Dò tìm dòng tiêu đề có sẵn (Header-based)
  // =========================================================================
  const CODE_HEADER_ALIASES = [
    'ma ncc',
    'ma nha cung cap',
    'ma doi tac',
    'code',
    'ma',
  ];
  const NAME_HEADER_ALIASES = [
    'ten nha cung cap',
    'ten ncc',
    'nha cung cap',
    'ncc',
    'ten doi tac',
    'doi tac',
    'name',
    'ten',
  ];
  const TYPE_HEADER_ALIASES = [
    'loai ncc',
    'loai nha cung cap',
    'nhom ncc',
    'nhom dich vu',
    'loai dich vu',
    'dich vu',
    'supplier type',
    'type',
  ];

  let headerRowIndex = -1;
  const maxScanRows = Math.min(matrix.length, 20);

  for (let r = 0; r < maxScanRows; r++) {
    const rowHeaders = (matrix[r] || []).map(normalizeExcelHeader);
    const hasCode = rowHeaders.some((h) => CODE_HEADER_ALIASES.includes(h));
    const hasName = rowHeaders.some((h) => NAME_HEADER_ALIASES.includes(h));

    if (hasCode && hasName) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex >= 0) {
    const headers = matrix[headerRowIndex].map(normalizeExcelHeader);
    const findColumn = (aliases: string[]) =>
      headers.findIndex((header) => aliases.includes(header));

    const codeCol = findColumn(CODE_HEADER_ALIASES);
    const nameCol = findColumn(NAME_HEADER_ALIASES);
    const typeCol = findColumn(TYPE_HEADER_ALIASES);

    const contactCol = findColumn(['nguoi lien he', 'contact name', 'contact']);
    const taxCodeCol = findColumn(['ma so thue', 'tax code', 'tax id']);
    const phoneCol = findColumn(['dien thoai', 'so dien thoai', 'phone']);
    const emailCol = findColumn(['email', 'thu dien tu']);
    const addressCol = findColumn(['dia chi', 'address']);
    const paymentTermsCol = findColumn(['dieu khoan thanh toan', 'payment terms']);

    const optionalValue = (row: unknown[], colIdx: number) =>
      colIdx < 0 ? undefined : excelCellText(row[colIdx]) || undefined;

    matrix.slice(headerRowIndex + 1).forEach((row, index) => {
      const sourceRow = headerRowIndex + index + 2;
      const code = excelCellText(row?.[codeCol]);
      let name = excelCellText(row?.[nameCol]);
      let type = typeCol >= 0 ? excelCellText(row?.[typeCol]) : undefined;

      // Bỏ qua dòng trống hoàn toàn
      if (!code && !name) return;

      if (!code || !name) {
        errors.push(`Dòng ${sourceRow}: thiếu ${!code ? 'Mã NCC' : 'Tên nhà cung cấp'}`);
        return;
      }

      const normalizedCode = code.toLowerCase();
      if (seenCodes.has(normalizedCode)) {
        errors.push(`Dòng ${sourceRow}: mã NCC "${code}" bị lặp trong file`);
        return;
      }
      seenCodes.add(normalizedCode);

      // Nếu cột loại NCC chưa có, kiểm tra xem tên có tiền tố (ví dụ XE - ...) hay không
      if (!type) {
        const extracted = extractSupplierPrefixAndName(name);
        name = extracted.name;
        type = extracted.supplierTypeName;
      }

      rows.push({
        sourceRow,
        input: {
          code,
          name,
          supplierTypeName: type || undefined,
          contactName: optionalValue(row, contactCol),
          taxCode: optionalValue(row, taxCodeCol),
          phone: optionalValue(row, phoneCol),
          email: optionalValue(row, emailCol),
          address: optionalValue(row, addressCol),
          paymentTerms: optionalValue(row, paymentTermsCol),
        },
      });
    });

    return {
      fileName,
      sheetName,
      rows,
      errors,
      strategyUsed: 'HEADER_BASED',
    };
  }

  // =========================================================================
  // CHIẾN LƯỢC 2: Không có tiêu đề (Headerless Pattern Recognition - Ảnh 2)
  // =========================================================================
  let maxColCount = 0;
  for (const row of matrix) {
    if (row && row.length > maxColCount) {
      maxColCount = row.length;
    }
  }

  // Thống kê từng cột: tìm cột chứa mã NCC (các chuỗi ngắn không khoảng trắng)
  let bestCodeCol = -1;
  let bestNameCol = -1;
  let highestCodeCount = 0;

  for (let c = 0; c < maxColCount; c++) {
    let codeCount = 0;
    for (const row of matrix) {
      const text = excelCellText(row?.[c]);
      // Kiểm tra định dạng mã NCC: độ dài từ 2 đến 25 ký tự, chữ/số/gạch, không có khoảng trắng
      if (text && /^[A-Za-z0-9_-]{2,25}$/.test(text)) {
        codeCount++;
      }
    }

    if (codeCount > highestCodeCount && codeCount >= 2) {
      highestCodeCount = codeCount;
      bestCodeCol = c;
    }
  }

  // Cột tên thường nằm liền kề bên phải cột mã
  if (bestCodeCol >= 0) {
    for (let c = bestCodeCol + 1; c < maxColCount; c++) {
      let textCount = 0;
      for (const row of matrix) {
        const text = excelCellText(row?.[c]);
        if (text && text.length > 2) {
          textCount++;
        }
      }
      if (textCount >= 2) {
        bestNameCol = c;
        break;
      }
    }
  }

  if (bestCodeCol >= 0 && bestNameCol >= 0) {
    matrix.forEach((row, index) => {
      const sourceRow = index + 1;
      const code = excelCellText(row?.[bestCodeCol]);
      const rawName = excelCellText(row?.[bestNameCol]);

      // Bỏ qua dòng trống phân cách giữa các nhóm
      if (!code && !rawName) return;

      if (!code || !rawName) {
        // Chỉ báo lỗi nếu dòng có vẻ là dữ liệu (có 1 trong 2 trường)
        if (code || rawName) {
          errors.push(
            `Dòng ${sourceRow}: thiếu ${!code ? 'Mã NCC' : 'Tên nhà cung cấp'}`,
          );
        }
        return;
      }

      const normalizedCode = code.toLowerCase();
      if (seenCodes.has(normalizedCode)) {
        errors.push(`Dòng ${sourceRow}: mã NCC "${code}" bị lặp trong file`);
        return;
      }
      seenCodes.add(normalizedCode);

      // Tách tiền tố XE -, NH -, VMB -...
      const { name, supplierTypeName } = extractSupplierPrefixAndName(rawName);

      rows.push({
        sourceRow,
        input: {
          code,
          name,
          supplierTypeName,
        },
      });
    });

    if (rows.length > 0) {
      return {
        fileName,
        sheetName,
        rows,
        errors,
        strategyUsed: 'PATTERN_BASED',
      };
    }
  }

  return {
    fileName,
    sheetName,
    rows: [],
    errors: ['Không tìm thấy dữ liệu nhà cung cấp hợp lệ trong sheet đầu tiên'],
    strategyUsed: 'UNKNOWN',
  };
}

/**
 * Đọc file Excel từ ArrayBuffer / Uint8Array và bóc tách dữ liệu nhà cung cấp
 */
export async function parseSupplierExcel(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<SupplierImportParseResult> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return {
        fileName,
        sheetName: '',
        rows: [],
        errors: ['File Excel không có sheet nào để nhập'],
        strategyUsed: 'UNKNOWN',
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    return parseSupplierMatrix(matrix, { fileName, sheetName });
  } catch (error: any) {
    return {
      fileName,
      sheetName: '',
      rows: [],
      errors: [
        `Không đọc được file Excel: ${error?.message || 'Định dạng file không hợp lệ'}`,
      ],
      strategyUsed: 'UNKNOWN',
    };
  }
}
