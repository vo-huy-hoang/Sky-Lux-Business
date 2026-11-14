import { calculateImportSummary } from '@/app/main/imports/hooks/useImportValidation';

describe('calculateImportSummary', () => {
  it('matches the Excel summary formulas for taxable and non-taxable services', () => {
    const summary = calculateImportSummary(
      [
        {
          id: 'revenue-1',
          stt: 1,
          quantity: 1,
          unitPrice: 145_800_000,
          vatRate: 0,
          status: 'VALID',
        },
      ],
      [
        {
          id: 'cost-vat',
          stt: 1,
          quantity: 1,
          unitPrice: 111_310_006,
          vatRate: 10,
          status: 'VALID',
        },
        {
          id: 'cost-vat-other',
          stt: 2,
          quantity: 1,
          unitPrice: 0,
          sourceAmount: 85_000_000,
          vatRate: 10,
          serviceCategoryCode: 'OTHER',
          status: 'VALID',
        },
        {
          id: 'cost-no-vat',
          stt: 3,
          quantity: 1,
          unitPrice: 4_850_000,
          vatRate: 0,
          status: 'VALID',
        },
      ],
    );

    expect(summary.service10.netRevenue).toBe(135_000_000);
    expect(summary.service10.netCost).toBe(196_310_006 / 1.08);
    expect(summary.service0.netCost).toBe(4_850_000);
    expect(summary.total.netCost).toBe(196_310_006 / 1.08 + 4_850_000);
    expect(summary.total.grossProfit).toBe(-51_618_524.07407406);
    expect(summary.profitMargin).toBe('-38.2%');
  });
});

import { renderHook } from '@testing-library/react';
import { useImportValidation } from '@/app/main/imports/hooks/useImportValidation';

describe('useImportValidation hook with budget enhancements', () => {
  it('extracts metadata, supplier resolution status, and financial reconciliation from staging row', () => {
    const mockPreviewData = {
      data: [
        {
          id: 'row-1',
          sessionId: 'session-123',
          sheetName: 'Dự toán',
          rowNumber: 1,
          status: 'VALID' as const,
          createdAt: '2026-11-14T10:00:00Z',
          updatedAt: '2026-11-14T10:00:00Z',
          rawData: {
            __importFormat: 'SKYLUX_CUSTOMER_BUDGET',
            'Tên hồ sơ': 'Tour Nha Trang 4N3D',
            'Tên khách hàng': 'Nguyễn Hoàng Long',
            'Số điện thoại': '0901234567',
            'Tuyến đường': 'Hà Nội - Nha Trang',
            'Thời gian': '4 ngày 3 đêm',
            'Ngày bắt đầu': '2026-12-01',
            'Ngày kết thúc': '2026-12-04',
            __revenueLines: [
              { quantity: 20, unitPrice: 10_000_000, description: 'Khách người lớn' },
            ],
            __costLines: [
              {
                stt: 1,
                categoryName: 'I. CHI PHÍ CÓ VAT',
                description: 'Xe 45 chỗ đưa đón',
                supplierName: 'Nhà xe Minh Đức',
                quantity: 1,
                multiplier: 1,
                unitPrice: 15_000_000,
                vatRate: 8,
              },
              {
                stt: 2,
                categoryName: 'II. CHI PHÍ KHÔNG VAT',
                description: 'Vé tham quan VinWonders',
                supplierName: 'Khu vui chơi Vinpearl',
                quantity: 20,
                multiplier: 1,
                unitPrice: 800_000,
                vatRate: 0,
              },
            ],
            __sourceSummary: {
              totalRevenue: 200_000_000,
              totalCost: 31_000_000,
              totalProfit: 169_000_000,
              profitRate: 0.845,
            },
          },
          normalizedData: {
            importFormat: 'SKYLUX_CUSTOMER_BUDGET',
            name: 'Tour Nha Trang 4N3D',
            customerName: 'Nguyễn Hoàng Long',
            phone: '0901234567',
            route: 'Hà Nội - Nha Trang',
            tourDuration: '4 ngày 3 đêm',
            startDate: '2026-12-01',
            endDate: '2026-12-04',
            businessLineName: 'TOUR',
            marketTypeName: 'NỘI ĐỊA',
            supplierResolution: [
              { name: 'Nhà xe Minh Đức', status: 'EXISTING', id: 'sup-1' },
              { name: 'Khu vui chơi Vinpearl', status: 'NEW_TO_BE_CREATED' },
            ],
          },
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    };

    const { result } = renderHook(() => useImportValidation(mockPreviewData));

    // 1. Metadata check
    expect(result.current.isCustomerBudget).toBe(true);
    expect(result.current.metadata.tourName).toBe('Tour Nha Trang 4N3D');
    expect(result.current.metadata.customerName).toBe('Nguyễn Hoàng Long');
    expect(result.current.metadata.phone).toBe('0901234567');
    expect(result.current.metadata.route).toBe('Hà Nội - Nha Trang');
    expect(result.current.metadata.tourDuration).toBe('4 ngày 3 đêm');

    // 2. Supplier Resolution check
    expect(result.current.costs).toHaveLength(2);
    expect(result.current.costs[0].supplier).toBe('Nhà xe Minh Đức');
    expect(result.current.costs[0].supplierStatus).toBe('EXISTING');
    expect(result.current.costs[0].isVatSection).toBe(true);

    expect(result.current.costs[1].supplier).toBe('Khu vui chơi Vinpearl');
    expect(result.current.costs[1].supplierStatus).toBe('NEW_TO_BE_CREATED');
    expect(result.current.costs[1].isVatSection).toBe(false);

    // 3. Financial Reconciliation check
    expect(result.current.financialReconciliation.calculatedRevenue).toBe(200_000_000);
    expect(result.current.financialReconciliation.calculatedCost).toBe(31_000_000);
    expect(result.current.financialReconciliation.calculatedGrossProfit).toBe(169_000_000);
    expect(result.current.financialReconciliation.revenueDelta).toBe(0);
    expect(result.current.financialReconciliation.costDelta).toBe(0);
    expect(result.current.financialReconciliation.profitDelta).toBe(0);
    expect(result.current.financialReconciliation.status).toBe('MATCHED');
  });

  it('detects MISMATCH when Excel summary deviates from sum of line items by > 1,000 VND', () => {
    const mockPreviewData = {
      data: [
        {
          id: 'row-2',
          sessionId: 'session-456',
          sheetName: 'Dự toán',
          rowNumber: 1,
          status: 'VALID' as const,
          createdAt: '2026-11-14T10:00:00Z',
          updatedAt: '2026-11-14T10:00:00Z',
          rawData: {
            __importFormat: 'SKYLUX_CUSTOMER_BUDGET',
            __revenueLines: [{ quantity: 1, unitPrice: 100_000_000 }],
            __costLines: [{ quantity: 1, multiplier: 1, unitPrice: 60_000_000 }],
            __sourceSummary: {
              totalRevenue: 100_000_000,
              totalCost: 50_000_000, // Excel summary cell was tampered with 50M instead of 60M (10M delta)
              totalProfit: 50_000_000,
            },
          },
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };

    const { result } = renderHook(() => useImportValidation(mockPreviewData));

    expect(result.current.financialReconciliation.calculatedCost).toBe(60_000_000);
    expect(result.current.financialReconciliation.costDelta).toBe(10_000_000);
    expect(result.current.financialReconciliation.status).toBe('MISMATCH');
  });

  it('Ticket 07 - flags lines with missing description without guessing fake names and flags line formula tampering', () => {
    const mockPreviewData = {
      data: [
        {
          id: 'row-3',
          sessionId: 'session-789',
          sheetName: 'Dự toán',
          rowNumber: 1,
          status: 'VALID' as const,
          createdAt: '2026-11-14T10:00:00Z',
          updatedAt: '2026-11-14T10:00:00Z',
          rawData: {
            __importFormat: 'SKYLUX_CUSTOMER_BUDGET',
            __revenueLines: [{ quantity: 1, unitPrice: 50_000_000 }],
            __costLines: [
              // Line 1: Missing description with positive amount (e.g. rows 32, 33 in Excel)
              {
                stt: 1,
                description: '', // Empty in Excel!
                categoryName: 'ĂN UỐNG',
                quantity: 2,
                multiplier: 1,
                unitPrice: 200_000,
                sourceAmount: 400_000,
              },
              // Line 2: Tampered formula (10 * 1 * 100,000 = 1,000,000, but source cell is 2,000,000)
              {
                stt: 2,
                description: 'Thuê cano',
                categoryName: 'VẬN CHUYỂN',
                quantity: 10,
                multiplier: 1,
                unitPrice: 100_000,
                sourceAmount: 2_000_000, // Tampered!
              },
            ],
            __sourceSummary: {
              totalRevenue: 50_000_000,
              totalCost: 2_400_000,
              totalProfit: 47_600_000,
            },
          },
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };

    const { result } = renderHook(() => useImportValidation(mockPreviewData));

    // Line 1: No fake name invented!
    expect(result.current.costs[0].content).toBe('');
    expect(result.current.costs[0].isMissingDescription).toBe(true);
    expect(result.current.costs[0].status).toBe('WARNING');
    expect(result.current.costs[0].statusMessage).toContain('Thiếu tên dịch vụ');

    // Line 2: Tampered line detected & independent multiplication enforced
    expect(result.current.costs[1].isTamperedFormula).toBe(true);
    // Calculated totalAmount must be 1,000,000 (10 * 100k), NOT the tampered 2,000,000!
    expect(result.current.costs[1].totalAmount).toBe(1_000_000);
    expect(result.current.costs[1].status).toBe('WARNING');
    expect(result.current.costs[1].statusMessage).toContain('Công thức lệch');

    // Total calculated cost is 400,000 + 1,000,000 = 1,400,000 (not 2.4M)
    expect(result.current.financialReconciliation.calculatedCost).toBe(1_400_000);
    expect(result.current.financialReconciliation.status).toBe('MISMATCH');
  });

  it('correctly reconciles net profit in useImportValidation using 1.08 VAT divisor', () => {
    const mockPreviewData = {
      data: [
        {
          id: 'row-4',
          sessionId: 'session-vat',
          sheetName: 'Dự toán',
          rowNumber: 1,
          status: 'VALID' as const,
          createdAt: '2026-11-14T10:00:00Z',
          updatedAt: '2026-11-14T10:00:00Z',
          rawData: {
            __importFormat: 'SKYLUX_CUSTOMER_BUDGET',
            __revenueLines: [{ quantity: 1, unitPrice: 145_800_000 }],
            __costLines: [
              {
                quantity: 1,
                multiplier: 1,
                unitPrice: 196_310_006,
                vatRate: 10,
                description: 'Có VAT',
              },
              {
                quantity: 1,
                multiplier: 1,
                unitPrice: 4_850_000,
                vatRate: 0,
                description: 'Chưa VAT',
              },
            ],
            __sourceSummary: {
              totalRevenue: 145_800_000,
              totalCost: 201_160_006,
              totalProfit: -51_618_524.07407406,
            },
          },
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };

    const { result } = renderHook(() => useImportValidation(mockPreviewData));

    expect(result.current.financialReconciliation.calculatedRevenue).toBe(145_800_000);
    expect(result.current.financialReconciliation.calculatedCost).toBe(201_160_006);
    expect(result.current.financialReconciliation.profitDelta).toBeLessThan(1);
    expect(result.current.financialReconciliation.status).toBe('MATCHED');
  });
});
