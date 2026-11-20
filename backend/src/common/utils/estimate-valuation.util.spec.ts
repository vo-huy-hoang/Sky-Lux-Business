import {
  EXCEL_VAT_DIVISOR,
  parseVatRate,
  toFiniteNumber,
  calculateWorkbookGrossAmount,
  calculateValuedNetAmount,
  valuateEstimate,
  reconcileEstimateValuation,
} from './estimate-valuation.util';

describe('EstimateValuation (Backend Canonical In-Process Core)', () => {
  it('exposes canonical EXCEL_VAT_DIVISOR = 1.08', () => {
    expect(EXCEL_VAT_DIVISOR).toBe(1.08);
  });

  describe('parseVatRate', () => {
    it('normalizes fractional decimals, explicit percent strings, integers, and invalid inputs', () => {
      expect(parseVatRate(0.08)).toBe(8);
      expect(parseVatRate(0.1)).toBe(10);
      expect(parseVatRate('0.08')).toBe(8);
      expect(parseVatRate(1)).toBe(1);
      expect(parseVatRate('1%')).toBe(1);
      expect(parseVatRate('0.5%')).toBe(0.5);
      expect(parseVatRate(8)).toBe(8);
      expect(parseVatRate(10)).toBe(10);
      expect(parseVatRate(100)).toBe(100);
      expect(parseVatRate('10%')).toBe(10);
      expect(parseVatRate('8,5%')).toBe(8.5);
      expect(parseVatRate(0)).toBe(0);
      expect(parseVatRate(-5)).toBe(0);
      expect(parseVatRate(NaN)).toBe(0);
      expect(parseVatRate(null)).toBe(0);
      expect(parseVatRate(undefined)).toBe(0);
      expect(parseVatRate('   ')).toBe(0);
      expect(parseVatRate('not-a-number')).toBe(0);
    });
  });

  describe('calculateWorkbookGrossAmount & calculateValuedNetAmount', () => {
    it('computes qty * multiplier * unitPrice preserving multipliers > 1 and explicit zero quantities/multipliers', () => {
      expect(
        calculateWorkbookGrossAmount({
          quantity: 10,
          multiplier: 2,
          unitPrice: 5_400_000,
        }),
      ).toBe(108_000_000);

      expect(
        calculateWorkbookGrossAmount({
          quantity: '4',
          multiplier: '1.5',
          unitPrice: '200000',
        }),
      ).toBe(1_200_000);

      expect(
        calculateWorkbookGrossAmount({
          quantity: 0,
          multiplier: 3,
          unitPrice: 500_000,
        }),
      ).toBe(0);

      expect(
        calculateWorkbookGrossAmount({
          quantity: 5,
          multiplier: 0,
          unitPrice: -500_000,
        }),
      ).toBe(0);
    });

    it('falls back cleanly on whitespace, booleans, null, and NaN in toFiniteNumber', () => {
      expect(toFiniteNumber(undefined, 1)).toBe(1);
      expect(toFiniteNumber(null, 1)).toBe(1);
      expect(toFiniteNumber('', 1)).toBe(1);
      expect(toFiniteNumber('   ', 1)).toBe(1);
      expect(toFiniteNumber(false, 1)).toBe(1);
      expect(toFiniteNumber(true, 5)).toBe(5);
      expect(toFiniteNumber(0, 1)).toBe(0);
      expect(toFiniteNumber(-0, 1)).toBe(0);
      expect(toFiniteNumber(NaN, 5)).toBe(5);
    });

    it('divides taxable lines by 1.08 and preserves non-taxable lines', () => {
      const line = { quantity: 1, multiplier: 1, unitPrice: 108_000_000 };
      expect(calculateValuedNetAmount(line, true)).toBeCloseTo(100_000_000, 6);
      expect(calculateValuedNetAmount(line, false)).toBe(108_000_000);
    });
  });

  describe('valuateEstimate', () => {
    it('valuates mixed 0%, 8%, 10% VAT lines and multipliers > 1 identically to Excel workbook rules', () => {
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

    it('handles zero revenue, break-even, and negative margins safely without NaN or -0', () => {
      const zeroRev = valuateEstimate(
        [],
        [{ quantity: 1, multiplier: 1, unitPrice: 5_000_000, vatRate: 0 }],
      );
      expect(zeroRev.revenueNet).toBe(0);
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
  });

  describe('reconcileEstimateValuation', () => {
    it('returns MATCHED when calculated valuation matches sourceSummary within 1 VND', () => {
      const rec = reconcileEstimateValuation(
        [{ quantity: 10, multiplier: 1, unitPrice: 10_800_000, vatRate: 8 }],
        [{ quantity: 10, multiplier: 1, unitPrice: 8_640_000, vatRate: 8 }],
        {
          totalRevenue: 108_000_000,
          totalCost: 86_400_000,
          totalProfit: 20_000_000,
        },
      );

      expect(rec.status).toBe('MATCHED');
      expect(rec.calculatedProfit).toBeCloseTo(20_000_000, 2);
      expect(rec.calculatedMargin).toBe(20);
      expect(rec.revenueDelta).toBe(0);
      expect(rec.costDelta).toBe(0);
      expect(rec.profitDelta).toBe(0);
    });

    it('falls back to grossProfit when workbook summary reports gross profit', () => {
      const rec = reconcileEstimateValuation(
        [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
        [{ quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 }],
        {
          totalRevenue: 108_000_000,
          totalCost: 86_400_000,
          totalProfit: 21_600_000,
        },
      );

      expect(rec.status).toBe('MATCHED');
      expect(rec.calculatedProfit).toBe(21_600_000);
      expect(rec.profitDelta).toBe(0);
    });

    it('returns ROUNDING_TOLERANCE for deltas between 1 and 1000 VND', () => {
      const rec = reconcileEstimateValuation(
        [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
        [{ quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 }],
        {
          totalRevenue: 108_000_500,
          totalCost: 86_400_000,
          totalProfit: 20_000_000,
        },
      );

      expect(rec.status).toBe('ROUNDING_TOLERANCE');
      expect(rec.revenueDelta).toBe(500);
    });

    it('handles NaN and explicit 0 source totals safely and detects tampering on revenue or cost lines', () => {
      const nanSource = reconcileEstimateValuation(
        [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
        [{ quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 }],
        { totalRevenue: Number.NaN, totalCost: Number.NaN },
      );
      expect(nanSource.revenueDelta).toBe(0);
      expect(nanSource.costDelta).toBe(0);
      expect(nanSource.status).toBe('MATCHED');

      const zeroSource = reconcileEstimateValuation(
        [{ quantity: 1, multiplier: 1, unitPrice: 108_000_000, vatRate: 8 }],
        [],
        { totalRevenue: 0 },
      );
      expect(zeroSource.revenueDelta).toBe(108_000_000);
      expect(zeroSource.status).toBe('MISMATCH');

      const tamperedRev = reconcileEstimateValuation(
        [
          {
            quantity: 1,
            multiplier: 1,
            unitPrice: 108_000_000,
            vatRate: 8,
            isTamperedFormula: true,
          },
        ],
        [{ quantity: 1, multiplier: 1, unitPrice: 86_400_000, vatRate: 8 }],
        {
          totalRevenue: 108_000_000,
          totalCost: 86_400_000,
          totalProfit: 20_000_000,
        },
      );
      expect(tamperedRev.status).toBe('MISMATCH');
      expect(tamperedRev.hasLineTampering).toBe(true);
    });
  });
});
