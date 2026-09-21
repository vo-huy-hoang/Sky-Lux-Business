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
    expect(row['Mã hồ sơ']).toBe('IMP-300726-TOUR-CONG-TY-ABC');
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
        vatRate: 10,
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
});
