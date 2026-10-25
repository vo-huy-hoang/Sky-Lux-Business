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
