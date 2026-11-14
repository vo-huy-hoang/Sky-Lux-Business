import {
  parseSupplierMatrix,
  parseSupplierExcel,
  extractSupplierPrefixAndName,
} from '../app/(main)/suppliers/utils/excel-supplier-parser';
import * as XLSX from 'xlsx';

describe('Excel Supplier Parser - Dual Strategy (Ticket 01)', () => {
  describe('extractSupplierPrefixAndName helper', () => {
    it('extracts known service prefixes and cleans name', () => {
      expect(extractSupplierPrefixAndName('XE - TRIỆU BẢO Ý')).toEqual({
        name: 'TRIỆU BẢO Ý',
        supplierTypeName: 'Dịch vụ xe',
      });

      expect(extractSupplierPrefixAndName('NH - MẸT HỘI AN')).toEqual({
        name: 'MẸT HỘI AN',
        supplierTypeName: 'Nhà hàng',
      });

      expect(extractSupplierPrefixAndName('VMB - WTS')).toEqual({
        name: 'WTS',
        supplierTypeName: 'Vé máy bay',
      });

      expect(extractSupplierPrefixAndName('KS - MƯỜNG THANH')).toEqual({
        name: 'MƯỜNG THANH',
        supplierTypeName: 'Khách sạn',
      });

      expect(extractSupplierPrefixAndName('VTQ - BÀ NÀ HILLS')).toEqual({
        name: 'BÀ NÀ HILLS',
        supplierTypeName: 'Vé tham quan',
      });

      expect(extractSupplierPrefixAndName('HDV - NGUYỄN VĂN A')).toEqual({
        name: 'NGUYỄN VĂN A',
        supplierTypeName: 'Hướng dẫn viên',
      });

      expect(extractSupplierPrefixAndName('BH - BẢO VIỆT')).toEqual({
        name: 'BẢO VIỆT',
        supplierTypeName: 'Bảo hiểm',
      });
    });

    it('supports full word prefix with dash or colon', () => {
      expect(extractSupplierPrefixAndName('Dịch vụ xe: XE DU LỊCH 29')).toEqual({
        name: 'XE DU LỊCH 29',
        supplierTypeName: 'Dịch vụ xe',
      });

      expect(extractSupplierPrefixAndName('Nhà hàng - Cơm Niêu')).toEqual({
        name: 'Cơm Niêu',
        supplierTypeName: 'Nhà hàng',
      });
    });

    it('returns original name when no known prefix matches', () => {
      expect(extractSupplierPrefixAndName('CÔNG TY TNHH ABC')).toEqual({
        name: 'CÔNG TY TNHH ABC',
        supplierTypeName: undefined,
      });

      expect(extractSupplierPrefixAndName('ABC - XYZ')).toEqual({
        name: 'ABC - XYZ',
        supplierTypeName: undefined,
      });
    });
  });

  describe('Strategy 1: Header-based file (Image 1)', () => {
    const sampleMatrixImage1 = [
      ['DANH MỤC NHÀ CUNG CẤP', '', '', '', '', '', '', '', 'THỐNG KÊ NCC'],
      ['', '', '', '', '', '', '', '', 'Tổng nhà cung cấp', 42],
      ['Danh sách nhà cung cấp theo nhóm dịch vụ', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', 'NHÓM DỊCH VỤ', 'SỐ LƯỢNG'],
      ['STT', 'Mã NCC', 'Tên nhà cung cấp', 'Loại NCC', 'Người liên hệ', 'Mã số thuế', 'Thành tiền'],
      [1, 'SUP01', 'TRIỆU BẢO Ý', 'Dịch vụ xe', '', '', ''],
      [2, 'SUP02', 'KIM HÙNG', 'Dịch vụ xe', '', '', ''],
      [3, 'SUP03', 'ASIA', 'Dịch vụ xe', '', '', ''],
      [4, 'SUP08', 'MẸT HỘI AN', 'Nhà hàng', '', '', ''],
    ];

    it('detects header on row 5, ignores extra columns and side tables', () => {
      const result = parseSupplierMatrix(sampleMatrixImage1, {
        fileName: 'Danh_sach_nha_cung_cap.xlsx',
        sheetName: 'NCC',
      });

      expect(result.strategyUsed).toBe('HEADER_BASED');
      expect(result.errors).toEqual([]);
      expect(result.rows).toHaveLength(4);

      expect(result.rows[0]).toEqual({
        sourceRow: 6,
        input: {
          code: 'SUP01',
          name: 'TRIỆU BẢO Ý',
          supplierTypeName: 'Dịch vụ xe',
        },
      });

      expect(result.rows[3]).toEqual({
        sourceRow: 9,
        input: {
          code: 'SUP08',
          name: 'MẸT HỘI AN',
          supplierTypeName: 'Nhà hàng',
        },
      });
    });

    it('tolerates header aliases like "Nhà cung cấp" and "Dịch vụ"', () => {
      const matrixWithAliases = [
        ['Mã NCC', 'Nhà cung cấp', 'Dịch vụ'],
        ['SUP-A', 'Công ty Xe A', 'Dịch vụ xe'],
        ['SUP-B', 'Nhà hàng B', 'Nhà hàng'],
      ];

      const result = parseSupplierMatrix(matrixWithAliases);
      expect(result.strategyUsed).toBe('HEADER_BASED');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].input.name).toBe('Công ty Xe A');
      expect(result.rows[0].input.supplierTypeName).toBe('Dịch vụ xe');
    });
  });

  describe('Strategy 2: Headerless raw file with prefixes (Image 2)', () => {
    const sampleMatrixImage2 = [
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', 'SUP01', 'XE - TRIỆU BẢO Ý', ''],
      ['', '', 'SUP02', 'XE - KIM HÙNG', ''],
      ['', '', 'SUP03', 'XE - ASIA', ''],
      ['', '', '', '', ''], // empty separator row 6
      ['', '', 'SUP08', 'NH - MẸT HỘI AN', ''],
      ['', '', 'SUP09', 'NH - MADAM NGA', ''],
      ['', '', '', '', ''], // empty separator row 9
      ['', '', 'SUP31', 'VMB - WTS', ''],
      ['', '', 'SUP32', 'VMB - VJ', ''],
    ];

    it('detects columns C and D, splits prefixes and skips empty separator rows', () => {
      const result = parseSupplierMatrix(sampleMatrixImage2, {
        fileName: 'MA_NCC.xlsx',
        sheetName: 'Sheet1',
      });

      expect(result.strategyUsed).toBe('PATTERN_BASED');
      expect(result.errors).toEqual([]);
      expect(result.rows).toHaveLength(7);

      // Verify row 3
      expect(result.rows[0]).toEqual({
        sourceRow: 3,
        input: {
          code: 'SUP01',
          name: 'TRIỆU BẢO Ý',
          supplierTypeName: 'Dịch vụ xe',
        },
      });

      // Verify row 7 (after blank row)
      expect(result.rows[3]).toEqual({
        sourceRow: 7,
        input: {
          code: 'SUP08',
          name: 'MẸT HỘI AN',
          supplierTypeName: 'Nhà hàng',
        },
      });

      // Verify row 10 (VMB)
      expect(result.rows[5]).toEqual({
        sourceRow: 10,
        input: {
          code: 'SUP31',
          name: 'WTS',
          supplierTypeName: 'Vé máy bay',
        },
      });
    });
  });

  describe('Validation & Error Handling', () => {
    it('detects duplicate codes within the same import file', () => {
      const matrixWithDupes = [
        ['Mã NCC', 'Tên nhà cung cấp', 'Loại NCC'],
        ['SUP01', 'Nhà xe A', 'Dịch vụ xe'],
        ['SUP01', 'Nhà xe B', 'Dịch vụ xe'], // duplicate
      ];

      const result = parseSupplierMatrix(matrixWithDupes);
      expect(result.rows).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('bị lặp');
    });

    it('reports error when a row is missing code or name', () => {
      const matrixMissing = [
        ['Mã NCC', 'Tên nhà cung cấp', 'Loại NCC'],
        ['', 'Nhà xe Không Mã', 'Dịch vụ xe'],
        ['SUP99', '', 'Nhà hàng'],
      ];

      const result = parseSupplierMatrix(matrixMissing);
      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('thiếu Mã NCC');
      expect(result.errors[1]).toContain('thiếu Tên nhà cung cấp');
    });

    it('returns error when matrix has no valid data', () => {
      const emptyMatrix: unknown[][] = [
        ['', ''],
        ['', ''],
      ];

      const result = parseSupplierMatrix(emptyMatrix);
      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Không tìm thấy dữ liệu nhà cung cấp hợp lệ');
    });

    it('parseSupplierExcel parses real binary workbook buffer', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['STT', 'Mã NCC', 'Tên nhà cung cấp', 'Loại NCC'],
        [1, 'SUP-TEST-1', 'Nhà xe Minh Quân', 'Dịch vụ xe'],
        [2, 'SUP-TEST-2', 'Khách sạn Biển Xanh', 'Khách sạn'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'NCC');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const result = await parseSupplierExcel(buffer, 'test_ncc.xlsx');
      expect(result.strategyUsed).toBe('HEADER_BASED');
      expect(result.sheetName).toBe('NCC');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].input.code).toBe('SUP-TEST-1');
      expect(result.rows[1].input.supplierTypeName).toBe('Khách sạn');
    });
  });
});
