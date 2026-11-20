import {
  EXCEL_VAT_DIVISOR,
  parseVatRate,
  toFiniteNumber,
  calculateWorkbookGrossAmount,
  calculateValuedNetAmount,
  valuateEstimate,
  reconcileEstimateValuation,
  classifyCostCategory,
  groupCostLinesByVatSection,
  buildCostSummaryRows,
} from '@/lib/estimate-valuation';

describe('EstimateValuation (Frontend Canonical In-Process Core — BE 1:1 Parity)', () => {
  it('matches Backend EXCEL_VAT_DIVISOR = 1.08 and parseVatRate normalization', () => {
    expect(EXCEL_VAT_DIVISOR).toBe(1.08);
    expect(parseVatRate(0.08)).toBe(8);
    expect(parseVatRate(0.1)).toBe(10);
    expect(parseVatRate(1)).toBe(1);
    expect(parseVatRate('1%')).toBe(1);
    expect(parseVatRate('0.5%')).toBe(0.5);
    expect(parseVatRate(100)).toBe(100);
    expect(parseVatRate('10%')).toBe(10);
    expect(parseVatRate('8,5%')).toBe(8.5);
    expect(parseVatRate(0)).toBe(0);
    expect(parseVatRate(NaN)).toBe(0);
    expect(parseVatRate(null)).toBe(0);
    expect(toFiniteNumber('   ', 1)).toBe(1);
    expect(toFiniteNumber(false, 1)).toBe(1);
  });

  it('produces identical valuation outputs to Backend across 0%/8%/10% VAT and multipliers > 1', () => {
    const result = valuateEstimate(
      [{ quantity: 10, multiplier: 2, unitPrice: 5_400_000, vatRate: 8 }],
      [
        { quantity: 20, multiplier: 2, unitPrice: 1_080_000, vatRate: 8 },
        { quantity: 10, multiplier: 1, unitPrice: 4_320_000, vatRate: 0.1 },
        { quantity: 5, multiplier: 1, unitPrice: 1_000_000, vatRate: 0 },
      ],
    );

    expect(result.revenueGross).toBe(108_000_000);
    expect(result.revenueNet).toBeCloseTo(100_000_000, 6);
    expect(result.costVatGross).toBe(86_400_000);
    expect(result.costVatNet).toBeCloseTo(80_000_000, 6);
    expect(result.costNoVatGross).toBe(5_000_000);
    expect(result.costNoVatNet).toBe(5_000_000);
    expect(result.costGross).toBe(91_400_000);
    expect(result.costNet).toBeCloseTo(85_000_000, 6);
    expect(result.profit).toBe(15_000_000);
    expect(result.marginPercent).toBe(15);
  });

  it('handles zero revenue, break-even, and negative margins without NaN or -0', () => {
    const zeroRev = valuateEstimate(
      [],
      [{ quantity: 1, multiplier: 1, unitPrice: 5_000_000, vatRate: 0 }],
    );
    expect(zeroRev.profit).toBe(-5_000_000);
    expect(zeroRev.marginPercent).toBe(0);

    const breakEven = valuateEstimate(
      [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
      [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
    );
    expect(breakEven.profit).toBe(0);
    expect(breakEven.marginPercent).toBe(0);

    const negMargin = valuateEstimate(
      [{ quantity: 1, multiplier: 1, unitPrice: 54_000_000, vatRate: 8 }],
      [{ quantity: 1, multiplier: 1, unitPrice: 60_000_000, vatRate: 0 }],
    );
    expect(negMargin.profit).toBe(-10_000_000);
    expect(negMargin.marginPercent).toBe(-20);
  });

  it('reconciles source summary with MATCHED, ROUNDING_TOLERANCE, MISMATCH, NaN, and 0 totals identically to Backend', () => {
    const matched = reconcileEstimateValuation(
      [{ quantity: 10, multiplier: 1, unitPrice: 10_800_000, vatRate: 8 }],
      [{ quantity: 10, multiplier: 1, unitPrice: 8_640_000, vatRate: 8 }],
      {
        totalRevenue: 108_000_000,
        totalCost: 86_400_000,
        totalProfit: 20_000_000,
      },
    );
    expect(matched.status).toBe('MATCHED');
    expect(matched.calculatedMargin).toBe(20);

    const tolerance = reconcileEstimateValuation(
      [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
      [{ quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 }],
      {
        totalRevenue: 108_000_400,
        totalCost: 86_400_000,
        totalProfit: 20_000_000,
      },
    );
    expect(tolerance.status).toBe('ROUNDING_TOLERANCE');
    expect(tolerance.revenueDelta).toBe(400);

    const mismatch = reconcileEstimateValuation(
      [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
      [{ quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 }],
      {
        totalRevenue: 0,
        totalCost: Number.NaN,
      },
    );
    expect(mismatch.status).toBe('MISMATCH');
    expect(mismatch.revenueDelta).toBe(108_000_000);
    expect(mismatch.costDelta).toBe(0);
  });

  it('classifies and groups cost lines into sorted Section I (VAT) and Section II (No-VAT)', () => {
    const lines = [
      { id: 'c3', description: 'Xe 45 chỗ đón sân bay', quantity: 2, multiplier: 1, unitPrice: 5_000_000, vatRate: 8 },
      { id: 'c1', description: 'Vé tham quan Bà Nà', quantity: 10, multiplier: 1, unitPrice: 900_000, vatRate: 10 },
      { id: 'c2', description: 'Khách sạn Mường Thanh', quantity: 5, multiplier: 2, unitPrice: 1_200_000, vatRate: 0.08 },
      { id: 'c4', description: 'Tip HDV địa phương', quantity: 1, multiplier: 3, unitPrice: 500_000, vatRate: 0 },
    ];

    expect(classifyCostCategory(lines[1]).code).toBe('1.1');
    expect(classifyCostCategory(lines[2]).code).toBe('1.2');
    expect(classifyCostCategory(lines[0]).code).toBe('1.3');

    const grouped = groupCostLinesByVatSection(lines);
    expect(grouped.vatSections.map((s) => s.code)).toEqual(['1.1', '1.2', '1.3']);
    expect(grouped.vatSections[0].subTotal).toBe(9_000_000);
    expect(grouped.vatSections[1].subTotal).toBe(12_000_000);
    expect(grouped.vatSections[2].subTotal).toBe(10_000_000);
    expect(grouped.totalVatGross).toBe(31_000_000);
    expect(grouped.noVatItems).toHaveLength(1);
    expect(grouped.totalNoVatGross).toBe(1_500_000);
    expect(grouped.grandTotalGross).toBe(32_500_000);
  });

  it('builds 3 canonical summary rows matching Excel workbook summary', () => {
    const rows = buildCostSummaryRows(
      [
        { quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 },
        { quantity: 1, multiplier: 1, unitPrice: 5_000_000, vatRate: 0 },
      ],
      108_000_000,
    );

    expect(rows).toHaveLength(3);
    expect(rows[0].key).toBe('service-vat');
    expect(rows[0].revenue).toBeCloseTo(100_000_000, 6);
    expect(rows[0].cost).toBeCloseTo(80_000_000, 6);
    expect(rows[0].grossProfit).toBeCloseTo(20_000_000, 6);
    expect(rows[1].key).toBe('service-no-vat');
    expect(rows[1].cost).toBe(5_000_000);
    expect(rows[1].grossProfit).toBe(-5_000_000);
    expect(rows[2].key).toBe('total');
    expect(rows[2].grossProfit).toBeCloseTo(15_000_000, 6);
  });

  it('exports workbook helpers matching net/gross rules and explicit zero multiplier', () => {
    expect(calculateWorkbookGrossAmount({ quantity: 2, multiplier: 3, unitPrice: 100 })).toBe(600);
    expect(calculateWorkbookGrossAmount({ quantity: 2, multiplier: 0, unitPrice: -100 })).toBe(0);
    expect(calculateValuedNetAmount({ quantity: 1, multiplier: 1, unitPrice: 108 }, true)).toBeCloseTo(100, 6);
  });
});
