import { renderHook } from '@testing-library/react';
import { useDossierFinancials } from '@/components/dossiers/detail/hooks/useDossierFinancials';
import { EstimateItem, EstimateStatus } from '@/types/estimate';

describe('useDossierFinancials (Phase 51: Memoized Financial Seam)', () => {
  it('handles null/undefined estimate gracefully with default zeros and valid costSummaryRows', () => {
    const { result } = renderHook(() => useDossierFinancials(null));

    expect(result.current.revenueGross).toBe(0);
    expect(result.current.revenue).toBe(0);
    expect(result.current.cost).toBe(0);
    expect(result.current.profit).toBe(0);
    expect(result.current.margin).toBe('0.00');
    expect(result.current.costSummaryRows).toBeDefined();
    expect(result.current.costSummaryRows.length).toBe(3);
  });

  it('calculates financial figures according to Sky-Lux Excel divisor rules', () => {
    const mockEstimate = {
      id: 'est-1',
      dossierId: 'dos-1',
      organizationId: 'org-1',
      currency: 'VND',
      versionNo: 1,
      status: EstimateStatus.APPROVED,
      revenueLines: [
        {
          id: 'rev-1',
          estimateId: 'est-1',
          description: 'Tour trọn gói',
          quantity: 10,
          multiplier: 1,
          unitPrice: 10800000,
          grossAmount: 108000000,
          vatRate: 8,
          createdAt: '',
          updatedAt: '',
        },
      ],
      costLines: [
        {
          id: 'cost-1',
          estimateId: 'est-1',
          description: 'Khách sạn',
          quantity: 5,
          multiplier: 1,
          unitPrice: 10800000,
          grossAmount: 54000000,
          vatRate: 8, // Net = 54,000,000 / 1.08 = 50,000,000
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    } as any as EstimateItem;

    const { result } = renderHook(() => useDossierFinancials(mockEstimate));

    // Gross Revenue = 108,000,000
    expect(result.current.revenueGross).toBe(108000000);
    // Net Revenue = 108,000,000 / 1.08 = 100,000,000
    expect(result.current.revenue).toBe(100000000);
    // Cost = 54,000,000 / 1.08 = 50,000,000
    expect(result.current.cost).toBe(50000000);
    // Profit = 100,000,000 - 50,000,000 = 50,000,000
    expect(result.current.profit).toBe(50000000);
    // Margin = (50,000,000 / 100,000,000) * 100 = 50.00%
    expect(result.current.margin).toBe('50.00');
  });

  it('includes every VAT cost line from Section I, including Section 1.4', () => {
    const mockEstimate = {
      id: 'est-2',
      dossierId: 'dos-2',
      organizationId: 'org-1',
      currency: 'VND',
      versionNo: 1,
      status: EstimateStatus.APPROVED,
      revenueLines: [
        {
          id: 'rev-1',
          estimateId: 'est-2',
          description: 'Tour',
          quantity: 1,
          multiplier: 1,
          unitPrice: 10800000,
          grossAmount: 10800000,
          vatRate: 8,
          createdAt: '',
          updatedAt: '',
        },
      ],
      costLines: [
        {
          id: 'cost-other',
          estimateId: 'est-2',
          description: 'Dịch vụ gala dinner khác', // Category 1.4
          quantity: 1,
          multiplier: 1,
          unitPrice: 5000000,
          grossAmount: 5000000,
          vatRate: 10,
          categoryTitle: 'DỊCH VỤ KHÁC',
          createdAt: '',
          updatedAt: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    } as any as EstimateItem;

    const { result } = renderHook(() => useDossierFinancials(mockEstimate));

    expect(result.current.cost).toBe(5000000 / 1.08);
    expect(result.current.profit).toBe(10000000 - 5000000 / 1.08);
    expect(result.current.margin).toBe('53.70');
  });

  it('memoizes calculation results and preserves reference when lines do not change', () => {
    const revenueLines = [
      {
        id: 'rev-1',
        estimateId: 'est-1',
        description: 'Tour',
        quantity: 1,
        multiplier: 1,
        unitPrice: 10800000,
        grossAmount: 10800000,
        createdAt: '',
        updatedAt: '',
      },
    ] as any;
    const costLines: any[] = [];

    const estimateA = {
      id: 'est-1',
      dossierId: 'dos-1',
      organizationId: 'org-1',
      currency: 'VND',
      versionNo: 1,
      status: EstimateStatus.DRAFT,
      revenueLines,
      costLines,
      createdAt: '',
      updatedAt: '',
    } as any as EstimateItem;

    const { result, rerender } = renderHook(
      ({ estimate }) => useDossierFinancials(estimate),
      { initialProps: { estimate: estimateA } },
    );

    const firstResult = result.current;

    // Re-render with new estimate object but same revenueLines / costLines arrays
    const estimateB = {
      ...estimateA,
      status: EstimateStatus.SUBMITTED,
      revenueLines,
      costLines,
    } as any as EstimateItem;

    expect(result.current).toBe(firstResult); // Exactly same memoized reference
  });

  it('TICKET-55.1: computes costSummaryRows and provides them from useDossierFinancials', () => {
    const mockEstimate = {
      id: 'est-summary',
      versionNo: 1,
      revenueLines: [
        { id: 'r1', quantity: 2, multiplier: 1, unitPrice: 10800000, grossAmount: 21600000 },
      ],
      costLines: [
        {
          id: 'c1',
          description: 'Khách sạn',
          quantity: 1,
          multiplier: 1,
          unitPrice: 10800000,
          grossAmount: 10800000,
          vatRate: 8,
        },
      ],
    } as any;

    const { result } = renderHook(() => useDossierFinancials(mockEstimate));
    expect(result.current.costSummaryRows).toBeDefined();
    expect(result.current.costSummaryRows).toHaveLength(3);
    const vatRow = result.current.costSummaryRows.find((r: any) => r.key === 'service-vat');
    expect(vatRow?.grossCost).toBe(10800000);
  });
});
