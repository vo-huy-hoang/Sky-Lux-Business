import { useEstimateDraftStore } from '../lib/stores/estimate-draft-store';

describe('useEstimateDraftStore (Zustand Realtime Tour Costing & Quote Calculator)', () => {
  beforeEach(() => {
    useEstimateDraftStore.getState().clearDraft();
  });

  it('should initialize with empty lines and default values', () => {
    const state = useEstimateDraftStore.getState();
    expect(state.dossierId).toBeNull();
    expect(state.currency).toBe('VND');
    expect(state.revenueLines).toEqual([]);
    expect(state.costLines).toEqual([]);
    expect(state.discountAmount).toBe(0);
    expect(state.commissionPercent).toBe(0);
    expect(state.getTotalRevenue()).toBe(0);
    expect(state.getTotalCost()).toBe(0);
    expect(state.getGrossProfit()).toBe(0);
    expect(state.getProfitMargin()).toBe(0);
    expect(state.getNetProfit()).toBe(0);
  });

  it('should add, update, and remove revenue lines with accurate VAT and multiplier calculations', () => {
    const store = useEstimateDraftStore.getState();

    // 1. Add Adult Tour Ticket: 10 pax * 20,000,000 VND, VAT 10%
    store.addRevenueLine({
      description: 'Vé Tour Người lớn',
      quantity: 10,
      unitPrice: 20_000_000,
      vatRate: 10,
      multiplier: 1,
    });

    const linesAfterAdd = useEstimateDraftStore.getState().revenueLines;
    expect(linesAfterAdd.length).toBe(1);
    expect(linesAfterAdd[0].description).toBe('Vé Tour Người lớn');

    // Expected Revenue: 10 * 20,000,000 * 1.10 = 220,000,000 VND
    expect(useEstimateDraftStore.getState().getTotalRevenue()).toBe(220_000_000);

    // 2. Update line: change quantity to 12
    const lineId = linesAfterAdd[0].id;
    useEstimateDraftStore.getState().updateRevenueLine(lineId, { quantity: 12 });

    // Expected: 12 * 20,000,000 * 1.10 = 264,000,000 VND
    expect(useEstimateDraftStore.getState().getTotalRevenue()).toBe(264_000_000);

    // 3. Remove line
    useEstimateDraftStore.getState().removeRevenueLine(lineId);
    expect(useEstimateDraftStore.getState().revenueLines.length).toBe(0);
    expect(useEstimateDraftStore.getState().getTotalRevenue()).toBe(0);
  });

  it('should add, update, and remove cost lines accurately', () => {
    const store = useEstimateDraftStore.getState();

    // Add Hotel Cost: 5 rooms * 2,000,000 VND * 3 nights (multiplier=3), VAT 8%
    store.addCostLine({
      description: 'Khách sạn 5 sao',
      quantity: 5,
      unitPrice: 2_000_000,
      multiplier: 3,
      vatRate: 8,
    });

    const costLines = useEstimateDraftStore.getState().costLines;
    expect(costLines.length).toBe(1);

    // 5 * 2,000,000 * 3 = 30,000,000 net; VAT 8% = 2,400,000; Total = 32,400,000 VND
    expect(useEstimateDraftStore.getState().getTotalCost()).toBe(32_400_000);
  });

  it('should accurately calculate Gross Profit, Margin, Commission, and Net Profit', () => {
    const store = useEstimateDraftStore.getState();

    // 1. Revenue: 100,000,000 VND (VAT 0%)
    store.addRevenueLine({
      description: 'Gói Tour Trọn gói',
      quantity: 1,
      unitPrice: 100_000_000,
      vatRate: 0,
    });

    // 2. Cost: 60,000,000 VND (VAT 0%)
    store.addCostLine({
      description: 'Chi phí Vé máy bay & Khách sạn',
      quantity: 1,
      unitPrice: 60_000_000,
      vatRate: 0,
    });

    expect(useEstimateDraftStore.getState().getTotalRevenue()).toBe(100_000_000);
    expect(useEstimateDraftStore.getState().getTotalCost()).toBe(60_000_000);
    expect(useEstimateDraftStore.getState().getGrossProfit()).toBe(40_000_000);
    expect(useEstimateDraftStore.getState().getProfitMargin()).toBe(40); // 40%

    // 3. Apply 5% Commission and 5,000,000 Discount
    useEstimateDraftStore.getState().setDiscountAmount(5_000_000);
    useEstimateDraftStore.getState().setCommissionPercent(5);

    // New Revenue = 100,000,000 - 5,000,000 = 95,000,000 VND
    expect(useEstimateDraftStore.getState().getTotalRevenue()).toBe(95_000_000);
    // Gross Profit = 95,000,000 - 60,000,000 = 35,000,000 VND
    expect(useEstimateDraftStore.getState().getGrossProfit()).toBe(35_000_000);
    // Profit Margin = 35,000,000 / 95,000,000 = 36.84%
    expect(useEstimateDraftStore.getState().getProfitMargin()).toBe(36.84);
    // Commission = 95,000,000 * 5% = 4,750,000 VND
    expect(useEstimateDraftStore.getState().getCommissionAmount()).toBe(4_750_000);
    // Net Profit = 35,000,000 - 4,750,000 = 30,250,000 VND
    expect(useEstimateDraftStore.getState().getNetProfit()).toBe(30_250_000);
  });
});
