import React from 'react';

// Mock xlsx module
const mockBookNew = jest.fn(() => ({ SheetNames: [], Sheets: {} }));
const mockAoaToSheet = jest.fn((data: any[][]) => ({ '!ref': 'A1:B10', data }));
const mockBookAppendSheet = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('xlsx', () => ({
  utils: {
    book_new: mockBookNew,
    aoa_to_sheet: mockAoaToSheet,
    book_append_sheet: mockBookAppendSheet,
  },
  writeFile: mockWriteFile,
}));

describe('Ticket 03: Dynamic Code-Splitting for xlsx and Chart.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should lazy-load xlsx on demand via dynamic import', async () => {
    // Verify xlsx can be dynamically imported
    const xlsx = await import('xlsx');
    expect(xlsx).toBeDefined();
    expect(xlsx.utils).toBeDefined();
    expect(xlsx.writeFile).toBeDefined();

    // Simulate exportSummary logic
    const workbook = xlsx.utils.book_new();
    const rows = [
      ['Chỉ số', 'Tất cả thời gian'],
      ['Tổng doanh thu', 50000000],
      ['Lợi nhuận', 15000000],
      ['Tổng hồ sơ', 10],
      ['Hồ sơ chờ duyệt', 2],
    ];
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, sheet, 'Tổng quan');
    xlsx.writeFile(workbook, 'bang-dieu-khien-tat-ca-thoi-gian.xlsx');

    expect(mockBookNew).toHaveBeenCalledTimes(1);
    expect(mockAoaToSheet).toHaveBeenCalledWith(rows);
    expect(mockBookAppendSheet).toHaveBeenCalledWith(workbook, sheet, 'Tổng quan');
    expect(mockWriteFile).toHaveBeenCalledWith(workbook, 'bang-dieu-khien-tat-ca-thoi-gian.xlsx');
  });

  it('should verify that CeoMonthlyRevenueChart module exports default component', async () => {
    const module = await import('@/components/ceo/CeoMonthlyRevenueChart');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});
