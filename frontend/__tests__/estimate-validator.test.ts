import {
  validateEstimateLines,
  EditableRevenueRow,
  EditableCostRow,
} from '@/components/dossiers/edit-import/validation/estimate-validator';

describe('Estimate Validation Engine (TICKET-62.2)', () => {
  const sampleValidRevenue: EditableRevenueRow[] = [
    {
      id: 'r1',
      stt: 1,
      description: 'Tour trọn gói Nhật Bản 6N5Đ',
      quantity: 20,
      multiplier: 1,
      unit: 'PAX',
      unitPrice: 35000000,
      vatRate: 10,
      note: 'Bao gồm vé và khách sạn',
      status: 'VALID',
    },
  ];

  const sampleValidCost: EditableCostRow[] = [
    {
      id: 'c1',
      stt: 1,
      description: 'Vé máy bay khứ hồi Vietnam Airlines',
      serviceCategoryId: 'cat-1',
      supplierId: 'sup-1',
      supplierName: 'Vietnam Airlines',
      quantity: 20,
      multiplier: 1,
      unit: 'PAX',
      unitPrice: 12000000,
      vatRate: 0,
      sourceAmount: null,
      note: 'Hạng phổ thông',
      status: 'VALID',
    },
    {
      id: 'c2',
      stt: 2,
      description: 'Khách sạn Tokyo Dome Hotel (5 đêm)',
      serviceCategoryId: 'cat-2',
      supplierId: 'sup-2',
      supplierName: 'Tokyo Dome Hotel',
      quantity: 10,
      multiplier: 5,
      unit: 'ROOM',
      unitPrice: 2500000,
      vatRate: 10,
      sourceAmount: null,
      note: 'Phòng đôi',
      status: 'VALID',
    },
  ];

  it('passes completely clean with 0 issues when all rows are valid and healthy margin', () => {
    // Total Revenue: 20 * 1 * 35tr = 700tr
    // Total Cost: (20*1*12tr) + (10*5*2.5tr) = 240tr + 125tr = 365tr
    // Margin: (700 - 365) / 700 = 47.8% (> 10%)
    const result = validateEstimateLines(sampleValidRevenue, sampleValidCost);

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.issues).toHaveLength(0);
    expect(result.validatedRevenueRows[0].status).toBe('VALID');
    expect(result.validatedCostRows[0].status).toBe('VALID');
    expect(result.validatedCostRows[1].status).toBe('VALID');
  });

  it('flags ERROR when description is missing or blank', () => {
    const revenueWithBlankDesc: EditableRevenueRow[] = [
      {
        ...sampleValidRevenue[0],
        description: '   ',
      },
    ];
    const costWithEmptyDesc: EditableCostRow[] = [
      {
        ...sampleValidCost[0],
        description: '',
      },
    ];

    const result = validateEstimateLines(revenueWithBlankDesc, costWithEmptyDesc);

    expect(result.errorCount).toBeGreaterThanOrEqual(2);
    expect(result.validatedRevenueRows[0].status).toBe('ERROR');
    expect(result.validatedCostRows[0].status).toBe('ERROR');
  });

  it('flags ERROR when quantity or multiplier is zero or negative', () => {
    const invalidQtyCost: EditableCostRow[] = [
      {
        ...sampleValidCost[0],
        quantity: 0,
      },
      {
        ...sampleValidCost[1],
        multiplier: -1,
      },
    ];

    const result = validateEstimateLines(sampleValidRevenue, invalidQtyCost);

    expect(result.errorCount).toBeGreaterThanOrEqual(2);
    expect(result.validatedCostRows[0].status).toBe('ERROR');
    expect(result.validatedCostRows[1].status).toBe('ERROR');
  });

  it('flags WARNING when unit price is 0 đ', () => {
    const zeroPriceRev: EditableRevenueRow[] = [
      {
        ...sampleValidRevenue[0],
        unitPrice: 0,
      },
    ];
    const zeroPriceCost: EditableCostRow[] = [
      {
        ...sampleValidCost[0],
        unitPrice: 0,
      },
    ];

    const result = validateEstimateLines(zeroPriceRev, zeroPriceCost);

    expect(result.warningCount).toBeGreaterThanOrEqual(2);
    expect(result.validatedRevenueRows[0].status).toBe('WARNING');
    expect(result.validatedCostRows[0].status).toBe('WARNING');
  });

  it('flags WARNING when external cost row lacks supplier', () => {
    const missingSupplierCost: EditableCostRow[] = [
      {
        ...sampleValidCost[0],
        supplierId: undefined,
        supplierName: undefined,
      },
    ];

    const result = validateEstimateLines(sampleValidRevenue, missingSupplierCost);

    const supplierWarning = result.issues.find((i) => i.id === `cost-supp-${missingSupplierCost[0].id}`);
    expect(supplierWarning).toBeDefined();
    expect(supplierWarning?.type).toBe('WARNING');
    expect(supplierWarning?.description).toContain('Chưa chọn nhà cung cấp');
  });

  it('does NOT flag missing supplier warning for internal tip or per-diem items', () => {
    const internalCost: EditableCostRow[] = [
      {
        ...sampleValidCost[0],
        description: 'Tiền tip cho tài xế và hướng dẫn viên',
        supplierId: undefined,
        supplierName: undefined,
      },
    ];

    const result = validateEstimateLines(sampleValidRevenue, internalCost);

    const supplierWarning = result.issues.find((i) => i.id === `cost-supp-${internalCost[0].id}`);
    expect(supplierWarning).toBeUndefined();
  });

  it('flags WARNING when row total deviates from imported sourceAmount by more than 1000 đ', () => {
    const costWithVariance: EditableCostRow[] = [
      {
        ...sampleValidCost[0],
        // Qty: 20 * Mult: 1 * UnitPrice: 12tr = 240tr
        // SourceAmount in Excel was 220tr
        sourceAmount: 220000000,
      },
    ];

    const result = validateEstimateLines(sampleValidRevenue, costWithVariance);

    const varianceWarning = result.issues.find((i) => i.id === `cost-source-${costWithVariance[0].id}`);
    expect(varianceWarning).toBeDefined();
    expect(varianceWarning?.description).toContain('Đơn giá tính toán lệch');
  });

  it('flags global financial ERROR when total cost exceeds total revenue (operating loss)', () => {
    const lowRevenue: EditableRevenueRow[] = [
      {
        ...sampleValidRevenue[0],
        unitPrice: 10000000, // Total: 20 * 10tr = 200tr
      },
    ];
    // Cost is 365tr > 200tr
    const result = validateEstimateLines(lowRevenue, sampleValidCost);

    const lossIssue = result.issues.find((i) => i.id === 'fin-loss');
    expect(lossIssue).toBeDefined();
    expect(lossIssue?.type).toBe('ERROR');
  });

  it('flags global financial WARNING when margin is low (< 10%)', () => {
    const tightRevenue: EditableRevenueRow[] = [
      {
        ...sampleValidRevenue[0],
        unitPrice: 19000000, // Total: 20 * 19tr = 380tr
      },
    ];
    // Cost: 365tr. Margin: (380 - 365) / 380 = 3.9% (< 10%)
    const result = validateEstimateLines(tightRevenue, sampleValidCost);

    const marginIssue = result.issues.find((i) => i.id === 'fin-low-margin');
    expect(marginIssue).toBeDefined();
    expect(marginIssue?.type).toBe('WARNING');
    expect(marginIssue?.description).toContain('3.9%');
  });
});
