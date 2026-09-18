import {
  EXCEL_VAT_DIVISOR,
  calculateLineGrossAmount,
  calculateLineNetAmount,
  getWorkbookNetAmount,
  getLineNetAmount,
  sumWorkbookGrossAmounts,
  sumLineNetAmounts,
} from '@/lib/financial-calculations';

describe('financial calculations', () => {
  it('calculates a line from quantity, multiplier, unit price, and VAT', () => {
    const line = { quantity: 3, multiplier: 2, unitPrice: 100_000, vatRate: 10 };

    expect(calculateLineNetAmount(line)).toBe(600_000);
    expect(calculateLineGrossAmount(line)).toBe(660_000);
  });

  it('preserves a valid zero quantity instead of replacing it with one', () => {
    expect(
      calculateLineNetAmount({ quantity: 0, multiplier: 2, unitPrice: 100_000 }),
    ).toBe(0);
  });

  it('uses the persisted net amount for summaries and falls back to the formula for new rows', () => {
    expect(
      sumLineNetAmounts([
        { quantity: 1, multiplier: 1, unitPrice: 100, netAmount: 120 },
        { quantity: 2, multiplier: 3, unitPrice: 50 },
      ]),
    ).toBe(420);
    expect(getLineNetAmount({ quantity: 2, multiplier: 3, unitPrice: 50 })).toBe(300);
  });

  it('matches the Excel summary divisor of 1.08', () => {
    const revenue = { quantity: 30, multiplier: 1, unitPrice: 4_500_000 };
    expect(EXCEL_VAT_DIVISOR).toBe(1.08);
    expect(sumWorkbookGrossAmounts([revenue])).toBe(135_000_000);
    expect(getWorkbookNetAmount({ quantity: 1, multiplier: 1, unitPrice: 145_800_000 }, true)).toBe(135_000_000);
    expect(getWorkbookNetAmount({ quantity: 1, multiplier: 1, unitPrice: 4_850_000 }, false)).toBe(4_850_000);
  });
});
