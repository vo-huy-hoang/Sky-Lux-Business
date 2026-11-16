import * as xlsx from 'xlsx';
import {
  CUSTOMER_BUDGET_FORMAT,
  isCustomerBudgetWorkbook,
  parseCustomerBudgetWorkbook,
} from './customer-budget.parser';

describe('customer-budget.parser', () => {
  it('recognizes and parses the customer budget layout', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    const values: Record<string, unknown> = {
      A9: 'DỰ TRÙ',
      D9: 'TOUR CÔNG TY ABC',
      C10: 'Nguyễn Văn A',
      E10: 974231555,
      G10: 'nguyenvana@gmail.com',
      I10: new Date('2020-08-19T00:00:00.000Z'),
      C11: 'Đà Nẵng - Hội An - Huế',
      F11: '30/07-02/08/2026',
      G11: 'Số ngày:',
      H11: '3 ngày 2 đêm',
      C12: 30,
      F12: 4500000,
      C13: 2,
      F13: 3150000,
      C14: 2,
      F14: 2250000,
      C15: 2,
      F15: 0,
      G13: 'MẢNG',
      H13: 'TOUR',
      G15: 'LOẠI HÌNH',
      H15: 'NỘI ĐỊA',
      C16: 145800000,
      C17: 27085179.63,
      D17: 0.2,
      A52: 'TỔNG CỘNG',
      G52: 201160006,
      A18: 'STT',
      A20: 'I',
      B20: 'DỊCH VỤ ĐẦU VÀO CÓ VAT',
      A21: '1.1',
      B21: 'VÉ THAM QUAN',
      B22: 'Hội An - Người lớn',
      C22: 'Công ty Vé Hội An',
      D22: 30,
      E22: 1,
      F22: 80000,
      G22: 2400000,
      H22: 'HOÀN THÀNH',
      A45: 'II',
      B45: 'DỊCH VỤ ĐẦU VÀO CHƯA VAT',
      A46: 1,
      B46: 'Khăn +Nước',
      D46: 30,
      E46: 3,
      F46: 10000,
      G46: 900000,
      A51: 7,
      B51: 'Bảo hiểm Du lịch trong nước',
      C51: '120tr/vụ/ngày',
      D51: 30,
      E51: 1,
      F51: 5000,
      G51: 150000,
    };
    for (const [address, value] of Object.entries(values)) {
      sheet[address] = {
        v: value,
        t: value instanceof Date ? 'd' : typeof value === 'number' ? 'n' : 's',
      };
    }
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    expect(isCustomerBudgetWorkbook(workbook)).toBe(true);
    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row.__importFormat).toBe(CUSTOMER_BUDGET_FORMAT);
    expect(row['Mã hồ sơ']).toBe('300726-TOUR-CONG-TY-ABC');
    expect(row['Tên hồ sơ']).toBe('TOUR CÔNG TY ABC');
    expect(row['Số điện thoại']).toBe('0974231555');
    expect(row['Ngày bắt đầu']).toBe('2026-07-30');
    expect(row['Ngày kết thúc']).toBe('2026-08-02');
    expect(row.tourDuration).toBe('3 ngày 2 đêm');
    expect(row.__businessLineCode).toBe('TOUR_DOMESTIC');
    expect(row.__businessLineName).toBe('TOUR');
    expect(row.__marketTypeCode).toBe('DOMESTIC');
    expect(row.__marketTypeName).toBe('NỘI ĐỊA');
    expect(row.__revenueLines).toHaveLength(4);
    expect(row.__costLines).toHaveLength(3);
    expect(row.__costLines[0]).toEqual(
      expect.objectContaining({
        serviceCategoryCode: 'ENTRANCE_FEE',
        categoryName: 'VÉ THAM QUAN',
        supplierName: 'Công ty Vé Hội An',
        quantity: 30,
        unitPrice: 80000,
        vatRate: 8,
        sourceAmount: 2400000,
      }),
    );
    expect(row.__costLines[2].supplierName).toBeUndefined();
  });

  it('preserves SỰ KIỆN and INBOUND classifications for confirmation', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    const values: Record<string, unknown> = {
      A9: 'DỰ TRÙ',
      D9: 'TOUR CÔNG TY ABC',
      F11: '30/08-02/09/2026',
      H13: 'SỰ KIỆN',
      H15: 'INBOUND',
      A18: 'STT',
    };
    for (const [address, value] of Object.entries(values)) {
      sheet[address] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's',
      };
    }
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row.__businessLineName).toBe('SỰ KIỆN');
    expect(row.__businessLineCode).toBe('MICE');
    expect(row.__marketTypeName).toBe('INBOUND');
    expect(row.__marketTypeCode).toBe('INBOUND');
  });

  it('maps VÉ LẺ to the ticket business line and keeps INBOUND', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    const values: Record<string, unknown> = {
      A9: 'DỰ TRÙ',
      D9: 'TOUR CÔNG TY ABC',
      F11: '30/09-02/10/2026',
      H13: 'VÉ LẺ',
      H15: 'INBOUND',
      A18: 'STT',
    };
    for (const [address, value] of Object.entries(values)) {
      sheet[address] = { v: value, t: 's' };
    }
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row.__businessLineName).toBe('VÉ LẺ');
    expect(row.__businessLineCode).toBe('TICKET_VISA');
    expect(row.__marketTypeCode).toBe('INBOUND');
  });

  it('infers the start year as the previous year when a range crosses New Year', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    const values: Record<string, unknown> = {
      A9: 'DỰ TRÙ',
      D9: 'TOUR TẾT',
      F11: '30/12-02/01/2027',
      A18: 'STT',
    };
    for (const [address, value] of Object.entries(values)) {
      sheet[address] = { v: value, t: 's' };
    }
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row['Ngày bắt đầu']).toBe('2026-12-30');
    expect(row['Ngày kết thúc']).toBe('2027-01-02');
  });

  it('preserves explicit years when a range crosses New Year', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    const values: Record<string, unknown> = {
      A9: 'DỰ TRÙ',
      D9: 'TOUR TẾT',
      F11: '30/12/2026-02/01/2027',
      A18: 'STT',
    };
    for (const [address, value] of Object.entries(values)) {
      sheet[address] = { v: value, t: 's' };
    }
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row['Ngày bắt đầu']).toBe('2026-12-30');
    expect(row['Ngày kết thúc']).toBe('2027-01-02');
  });
  it('parses cost lines with blank descriptions as empty strings instead of generating synthetic text', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    const values: Record<string, unknown> = {
      A9: 'DỰ TRÙ',
      D9: 'TOUR CÔNG TY ABC',
      F11: '30/07-02/08/2026',
      A18: 'STT',
      A20: 'I',
      B20: 'DỊCH VỤ ĐẦU VÀO CÓ VAT',
      A21: '1.2b',
      B21: 'ĂN UỐNG',
      B22: 'Trưa ngày 30/07',
      C22: 'NH MADAM LÂN',
      D22: 30,
      E22: 1,
      F22: 200000,
      G22: 6000000,
      // Row 23 has empty description (B23 is blank)
      D23: 2,
      E23: 1,
      F23: 200001,
      G23: 400002,
      // Row 24 has empty description (B24 is blank)
      D24: 2,
      E24: 1,
      F24: 200002,
      G24: 400004,
    };
    for (const [address, value] of Object.entries(values)) {
      sheet[address] = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's',
      };
    }
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);
    expect(row.__costLines).toHaveLength(3);
    expect(row.__costLines[0].description).toBe('Trưa ngày 30/07');
    expect(row.__costLines[1].description).toBe('');
    expect(row.__costLines[2].description).toBe('');
  });

  it('recognizes lowercase and diacritic variation sheet names (e.g. "Dự toán")', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR MIỀN TÂY', t: 's' };
    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Dự toán');

    expect(isCustomerBudgetWorkbook(workbook)).toBe(true);
    const row = parseCustomerBudgetWorkbook(workbook);
    expect(row['Tên hồ sơ']).toBe('TOUR MIỀN TÂY');
  });

  it('dynamically parses a shifted sheet where rows are moved down due to logo/header', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    // Shifting everything down by 5 rows (Logo in rows 1-5)
    // Title at row 14 instead of row 9
    sheet['A14'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D14'] = { v: 'TOUR NHA TRANG', t: 's' };
    // Route at row 16
    sheet['B16'] = { v: 'Tuyến Tour:', t: 's' };
    sheet['C16'] = { v: 'Nha Trang - Bình Ba', t: 's' };
    sheet['E16'] = { v: 'Thời gian:', t: 's' };
    sheet['F16'] = { v: '10/08-14/08/2026', t: 's' };
    sheet['H16'] = { v: '4 ngày 3 đêm', t: 's' };
    // STT at row 23 instead of row 18
    sheet['A23'] = { v: 'STT', t: 's' };
    sheet['B23'] = { v: 'NỘI DUNG', t: 's' };
    sheet['C23'] = { v: 'NHÀ CUNG CẤP', t: 's' };
    sheet['D23'] = { v: 'SL', t: 's' };
    sheet['E23'] = { v: 'HỆ SỐ', t: 's' };
    sheet['F23'] = { v: 'ĐƠN GIÁ', t: 's' };
    sheet['G23'] = { v: 'THÀNH TIỀN', t: 's' };
    // Section I at row 25
    sheet['A25'] = { v: 'I', t: 's' };
    sheet['B25'] = { v: 'DỊCH VỤ CÓ VAT', t: 's' };
    sheet['A26'] = { v: '1.1', t: 's' };
    sheet['B26'] = { v: 'KHÁCH SẠN', t: 's' };
    sheet['B27'] = { v: 'Khách sạn Mường Thanh 4*', t: 's' };
    sheet['C27'] = { v: 'Mường Thanh Hospitality', t: 's' };
    sheet['D27'] = { v: 10, t: 'n' };
    sheet['E27'] = { v: 3, t: 'n' };
    sheet['F27'] = { v: 1200000, t: 'n' };
    sheet['G27'] = { v: 36000000, t: 'n' };
    // Total at row 28
    sheet['A28'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G28'] = { v: 36000000, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN TOUR');

    expect(isCustomerBudgetWorkbook(workbook)).toBe(true);
    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row['Tên hồ sơ']).toBe('TOUR NHA TRANG');
    expect(row['Tuyến đường']).toBe('Nha Trang - Bình Ba');
    expect(row['Ngày bắt đầu']).toBe('2026-08-10');
    expect(row['Ngày kết thúc']).toBe('2026-08-14');
    expect(row.tourDuration).toBe('4 ngày 3 đêm');
    expect(row.__costLines).toHaveLength(1);
    expect(row.__costLines[0].supplierName).toBe('Mường Thanh Hospitality');
    expect(row.__costLines[0].sourceAmount).toBe(36000000);
    expect(row.__sourceSummary.totalCost).toBe(36000000);
  });

  it('parses long tours beyond row 51 without truncation', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR XUYÊN VIỆT 21 NGÀY', t: 's' };
    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };
    sheet['A20'] = { v: 'I', t: 's' };
    sheet['B20'] = { v: 'DỊCH VỤ CÓ VAT', t: 's' };
    sheet['A21'] = { v: '1.1', t: 's' };
    sheet['B21'] = { v: 'VẬN CHUYỂN', t: 's' };

    // Generate 60 service rows from row 22 to row 81
    for (let r = 22; r <= 81; r++) {
      sheet[`B${r}`] = { v: `Chặng di chuyển ngày ${r - 21}`, t: 's' };
      sheet[`D${r}`] = { v: 1, t: 'n' };
      sheet[`E${r}`] = { v: 1, t: 'n' };
      sheet[`F${r}`] = { v: 1000000, t: 'n' };
      sheet[`G${r}`] = { v: 1000000, t: 'n' };
    }
    // Summary at row 82 (far beyond row 51)
    sheet['A82'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G82'] = { v: 60000000, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);
    expect(row.__costLines).toHaveLength(60);
    expect(row.__sourceSummary.totalCost).toBe(60000000);
  });

  it('handles row-deleted files matching the structure of mau.xlsx where STT is at A17 and Sheet1', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR CÔNG TY ABC', t: 's' };
    sheet['B10'] = { v: 'Tuyến Tour:', t: 's' };
    sheet['C10'] = { v: 'Đà Nẵng - Hội An - Huế', t: 's' };
    sheet['E10'] = { v: 'Thời gian:', t: 's' };
    sheet['F10'] = { v: '30/07-02/08/2026', t: 's' };
    sheet['G10'] = { v: 'Số ngày:', t: 's' };
    sheet['H10'] = { v: '3 ngày 2 đêm', t: 's' };
    // Revenue at row 11-14
    sheet['B11'] = { v: 'Số lượng người lớn', t: 's' };
    sheet['C11'] = { v: 30, t: 'n' };
    sheet['E11'] = { v: 'Đơn giá NL', t: 's' };
    sheet['F11'] = { v: 4500000, t: 'n' };
    // Summary at row 15-16
    sheet['B15'] = { v: 'Tổng doanh thu', t: 's' };
    sheet['C15'] = { v: 145800000, t: 'n' };
    sheet['B16'] = { v: 'Tổng lợi nhuận', t: 's' };
    sheet['C16'] = { v: 27085179, t: 'n' };
    sheet['D16'] = { v: 0.2, t: 'n' };
    // Header at A17
    sheet['A17'] = { v: 'STT', t: 's' };
    sheet['B17'] = { v: 'NỘI DUNG', t: 's' };
    sheet['A19'] = { v: 'I', t: 's' };
    sheet['B19'] = { v: 'DỊCH VỤ ĐẦU VÀO CÓ VAT', t: 's' };
    sheet['A20'] = { v: '1.1', t: 's' };
    sheet['B20'] = { v: 'VÉ THAM QUAN', t: 's' };
    sheet['B21'] = { v: 'Hội An - Người lớn', t: 's' };
    sheet['D21'] = { v: 30, t: 'n' };
    sheet['E21'] = { v: 1, t: 'n' };
    sheet['F21'] = { v: 80000, t: 'n' };
    sheet['G21'] = { v: 2400000, t: 'n' };
    sheet['A51'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G51'] = { v: 201160006, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    expect(isCustomerBudgetWorkbook(workbook)).toBe(true);
    const row = parseCustomerBudgetWorkbook(workbook);

    expect(row['Tên hồ sơ']).toBe('TOUR CÔNG TY ABC');
    expect(row['Tuyến đường']).toBe('Đà Nẵng - Hội An - Huế');
    expect(row['Ngày bắt đầu']).toBe('2026-07-30');
    expect(row['Ngày kết thúc']).toBe('2026-08-02');
    expect(row.__costLines).toHaveLength(1);
    expect(row.__revenueLines).toHaveLength(1);
    expect(row.__revenueLines[0].unitPrice).toBe(4500000);
    expect(row.__sourceSummary.totalCost).toBe(201160006);
    expect(row.__sourceSummary.totalRevenue).toBe(145800000);
  });

  it('detects custom VAT rate from section header (e.g. "CÓ VAT (8%)")', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR HẠ LONG', t: 's' };
    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };
    sheet['A20'] = { v: 'I', t: 's' };
    sheet['B20'] = { v: 'DỊCH VỤ ĐẦU VÀO CÓ VAT (8%)', t: 's' };
    sheet['A21'] = { v: '1.1', t: 's' };
    sheet['B21'] = { v: 'DU THUYỀN', t: 's' };
    sheet['B22'] = { v: 'Du thuyền Ambassador 5*', t: 's' };
    sheet['D22'] = { v: 2, t: 'n' };
    sheet['E22'] = { v: 1, t: 'n' };
    sheet['F22'] = { v: 5000000, t: 'n' };
    sheet['G22'] = { v: 10000000, t: 'n' };
    sheet['A23'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G23'] = { v: 10000000, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);
    expect(row.__costLines[0].vatRate).toBe(8);
  });

  it('reads inline VAT percentage from dedicated VAT column', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR ĐÀ LẠT', t: 's' };
    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };
    sheet['G18'] = { v: 'THÀNH TIỀN', t: 's' };
    sheet['H18'] = { v: 'VAT (%)', t: 's' };
    sheet['A20'] = { v: 'I', t: 's' };
    sheet['B20'] = { v: 'DỊCH VỤ CÓ VAT', t: 's' };
    sheet['A21'] = { v: '1.1', t: 's' };
    sheet['B21'] = { v: 'VÉ THAM QUAN', t: 's' };
    sheet['B22'] = { v: 'Vé Thung Lũng Tình Yêu (Vé ưu đãi 5%)', t: 's' };
    sheet['D22'] = { v: 10, t: 'n' };
    sheet['E22'] = { v: 1, t: 'n' };
    sheet['F22'] = { v: 250000, t: 'n' };
    sheet['G22'] = { v: 2500000, t: 'n' };
    sheet['H22'] = { v: 5, t: 'n' }; // 5% inline
    sheet['A23'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G23'] = { v: 2500000, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);
    expect(row.__costLines[0].vatRate).toBe(5);
  });

  it('applies defaultSectionIVatRate option when header does not specify VAT', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR PHÚ QUỐC', t: 's' };
    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };
    sheet['A20'] = { v: 'I', t: 's' };
    sheet['B20'] = { v: 'DỊCH VỤ CÓ VAT', t: 's' };
    sheet['A21'] = { v: '1.1', t: 's' };
    sheet['B21'] = { v: 'KHÁCH SẠN', t: 's' };
    sheet['B22'] = { v: 'Resort Vinpearl', t: 's' };
    sheet['D22'] = { v: 2, t: 'n' };
    sheet['E22'] = { v: 1, t: 'n' };
    sheet['F22'] = { v: 3000000, t: 'n' };
    sheet['G22'] = { v: 6000000, t: 'n' };
    sheet['A23'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G23'] = { v: 6000000, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook, {
      defaultSectionIVatRate: 8,
    });
    expect(row.__costLines[0].vatRate).toBe(8);
  });

  it('computes 2-way financial reconciliation and detects discrepancies', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR SÀI GÒN', t: 's' };
    // Revenue: 10 adults * 2,000,000 = 20,000,000
    sheet['C12'] = { v: 10, t: 'n' };
    sheet['F12'] = { v: 2000000, t: 'n' };
    // Excel source claims Total Revenue is 20,000,000
    sheet['C16'] = { v: 20000000, t: 'n' };

    // Cost: 1 item * 12,000,000
    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };
    sheet['A20'] = { v: 'I', t: 's' };
    sheet['B20'] = { v: 'DỊCH VỤ CÓ VAT', t: 's' };
    sheet['A21'] = { v: '1.1', t: 's' };
    sheet['B21'] = { v: 'XE', t: 's' };
    sheet['B22'] = { v: 'Xe 29 chỗ', t: 's' };
    sheet['D22'] = { v: 1, t: 'n' };
    sheet['E22'] = { v: 1, t: 'n' };
    sheet['F22'] = { v: 12000000, t: 'n' };
    sheet['G22'] = { v: 12000000, t: 'n' };

    // Tampered total cost: Excel cell G52 claims 15,000,000 instead of 12,000,000
    sheet['A23'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G23'] = { v: 15000000, t: 'n' };
    sheet['G52'] = { v: 15000000, t: 'n' };

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);
    const rec = row.__financialReconciliation;

    expect(rec).toBeDefined();
    expect(rec?.calculatedRevenue).toBe(20000000);
    expect(rec?.calculatedCost).toBe(12000000);
    expect(rec?.calculatedGrossProfit).toBe(8000000);
    expect(rec?.calculatedProfitMarginPercent).toBe(40);
    // Discrepancy detected because 15,000,000 in Excel != 12,000,000 calculated
    expect(rec?.status).toBe('MISMATCH');
    expect(rec?.costDelta).toBe(3000000);
    expect(rec?.warnings.length).toBeGreaterThan(0);
    expect(rec?.warnings[0]).toContain('Chênh lệch chi phí');
  });

  it('marks reconciliation status as MATCHED when figures agree within 1 VND', () => {
    const sheet = xlsx.utils.aoa_to_sheet([]);
    sheet['A9'] = { v: 'DỰ TRÙ', t: 's' };
    sheet['D9'] = { v: 'TOUR CẦN THƠ', t: 's' };
    sheet['C12'] = { v: 5, t: 'n' };
    sheet['F12'] = { v: 1000000, t: 'n' };
    sheet['C16'] = { v: 5000000, t: 'n' }; // Revenue matches

    sheet['A18'] = { v: 'STT', t: 's' };
    sheet['B18'] = { v: 'NỘI DUNG', t: 's' };
    sheet['A20'] = { v: 'I', t: 's' };
    sheet['B20'] = { v: 'DỊCH VỤ CÓ VAT', t: 's' };
    sheet['A21'] = { v: '1.1', t: 's' };
    sheet['B21'] = { v: 'TÀU', t: 's' };
    sheet['B22'] = { v: 'Tàu Chợ Nổi', t: 's' };
    sheet['D22'] = { v: 1, t: 'n' };
    sheet['E22'] = { v: 1, t: 'n' };
    sheet['F22'] = { v: 3000000, t: 'n' };
    sheet['G22'] = { v: 3000000, t: 'n' };

    sheet['A23'] = { v: 'TỔNG CỘNG', t: 's' };
    sheet['G23'] = { v: 3000000, t: 'n' }; // Cost matches
    sheet['G52'] = { v: 3000000, t: 'n' };
    sheet['C17'] = { v: 2000000, t: 'n' }; // Profit = 5,000,000 - 3,000,000 = 2,000,000

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'DỰ TOÁN');

    const row = parseCustomerBudgetWorkbook(workbook);
    const rec = row.__financialReconciliation;

    expect(rec?.status).toBe('MATCHED');
    expect(rec?.revenueDelta).toBe(0);
    expect(rec?.costDelta).toBe(0);
    expect(rec?.profitDelta).toBe(0);
    expect(rec?.warnings).toHaveLength(0);
  });
});
