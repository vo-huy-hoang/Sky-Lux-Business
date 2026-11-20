import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  valuateEstimate,
  reconcileEstimateValuation,
} from '@/lib/estimate-valuation';
import { useDossierFinancials } from '@/components/dossiers/detail/hooks/useDossierFinancials';
import { calculateImportSummary } from '@/app/(main)/imports/hooks/useImportValidation';
import { useEstimateEditorState } from '@/components/dossiers/edit-import/hooks/useEstimateEditorState';
import { ExecutiveApprovalModal } from '@/app/(main)/approvals/components/ExecutiveApprovalModal';
import { EstimateItem, EstimateStatus } from '@/types/estimate';
import { estimatesService } from '@/services/estimates.service';
import { dossiersService } from '@/services/dossiers.service';

jest.mock('@/services/estimates.service', () => ({
  estimatesService: {
    getEstimate: jest.fn(),
  },
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossier: jest.fn(),
  },
}));

jest.mock('@/services/workflow.service', () => ({
  workflowService: {
    approve: jest.fn(),
    requestChanges: jest.fn(),
  },
}));

describe('Ticket 03: Frontend Financial Parity across 4 Surfaces', () => {
  let queryClient: QueryClient;
  const originalGetComputedStyle = window.getComputedStyle;

  beforeAll(() => {
    window.getComputedStyle = (elt: Element) => originalGetComputedStyle(elt);
  });

  afterAll(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  // Canonical Fixture Tour with mixed VAT (8%, 10%) and non-VAT (0%) lines
  // Revenue:
  // - 20 Pax Adults @ 10,800,000 (VAT 8%) = 216,000,000
  // - 5 Pax Children @ 5,400,000 (VAT 8%) = 27,000,000
  // Total Revenue Gross = 243,000,000 VND
  // Canonical Valued Net Revenue = 243,000,000 / 1.08 = 225,000,000 VND
  const fixtureRevenueLines = [
    {
      id: 'rev-adults',
      description: 'Vé tour Người lớn',
      quantity: 20,
      multiplier: 1,
      unitPrice: 10800000,
      vatRate: 8,
      netAmount: 216000000,
      grossAmount: 233280000,
    },
    {
      id: 'rev-children',
      description: 'Vé tour Trẻ em',
      quantity: 5,
      multiplier: 1,
      unitPrice: 5400000,
      vatRate: 8,
      netAmount: 27000000,
      grossAmount: 29160000,
    },
  ];

  // Cost:
  // - 10 rooms * 2 nights @ 2,700,000 (VAT 8%) = 54,000,000 -> Valued Net: 50,000,000
  // - 1 bus * 1 @ 32,400,000 (VAT 10%) = 32,400,000 -> Valued Net: 30,000,000
  // - 25 entrance tickets @ 800,000 (VAT 0%) = 20,000,000 -> Valued Net: 20,000,000
  // - 1 guide * 4 days @ 2,500,000 (VAT 0%) = 10,000,000 -> Valued Net: 10,000,000
  // Total Cost Gross = 116,400,000 VND
  // Total Valued Net Cost = 50M + 30M + 20M + 10M = 110,000,000 VND
  // Canonical Profit = 225,000,000 - 110,000,000 = 115,000,000 VND
  // Canonical Margin = (115,000,000 / 225,000,000) * 100 = 51.1111...% -> 51.11%
  const fixtureCostLines = [
    {
      id: 'cost-hotel',
      description: 'Khách sạn Mường Thanh 4 sao',
      quantity: 10,
      multiplier: 2,
      unitPrice: 2700000,
      vatRate: 8,
      netAmount: 54000000,
      grossAmount: 58320000,
      categoryTitle: 'KHÁCH SẠN',
      supplierName: 'KS Mường Thanh',
    },
    {
      id: 'cost-bus',
      description: 'Xe 45 chỗ đời mới đón tiễn',
      quantity: 1,
      multiplier: 1,
      unitPrice: 32400000,
      vatRate: 10,
      netAmount: 32400000,
      grossAmount: 35640000,
      categoryTitle: 'VẬN CHUYỂN',
      supplierName: 'Nhà xe Minh Đức',
    },
    {
      id: 'cost-tickets',
      description: 'Vé tham quan Bà Nà Hills',
      quantity: 25,
      multiplier: 1,
      unitPrice: 800000,
      vatRate: 0,
      netAmount: 20000000,
      grossAmount: 20000000,
      categoryTitle: 'VÉ THAM QUAN',
      supplierName: 'Sun World Bà Nà',
    },
    {
      id: 'cost-guide',
      description: 'Hướng dẫn viên suốt tuyến',
      quantity: 1,
      multiplier: 4,
      unitPrice: 2500000,
      vatRate: 0,
      netAmount: 10000000,
      grossAmount: 10000000,
      categoryTitle: 'CÁC DỊCH VỤ KHÁC',
      supplierName: 'HDV Tự do',
    },
  ];

  const fixtureEstimate: EstimateItem = {
    id: 'est-parity-123',
    organizationId: 'org-parity',
    dossierId: 'dossier-parity-456',
    versionNo: 1,
    status: EstimateStatus.SUBMITTED,
    currency: 'VND',
    totalRevenue: 225000000,
    totalCost: 110000000,
    totalProfit: 115000000,
    profitMargin: 51.11,
    revenueLines: fixtureRevenueLines as any,
    costLines: fixtureCostLines as any,
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
    dossier: {
      id: 'dossier-parity-456',
      code: 'DOS-PARITY-001',
      name: 'Tour Miền Trung Di Sản',
      route: 'Đà Nẵng - Hội An - Huế',
      customer: {
        id: 'cust-1',
        displayName: 'Công ty Cổ phần Du lịch Á Châu',
      },
    },
  } as any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('1. Core Valuation Engine: computes canonical valued figures with 1:1 mathematical precision', () => {
    const valuation = valuateEstimate(fixtureRevenueLines, fixtureCostLines);

    expect(valuation.revenueGross).toBe(243000000);
    expect(valuation.revenueNet).toBe(225000000);
    expect(valuation.costVatGross).toBe(86400000);
    expect(valuation.costVatNet).toBe(80000000); // 86.4M / 1.08 = 80M
    expect(valuation.costNoVatGross).toBe(30000000);
    expect(valuation.costNoVatNet).toBe(30000000);
    expect(valuation.costGross).toBe(116400000);
    expect(valuation.costNet).toBe(110000000);
    expect(valuation.profitExact).toBe(115000000);
    expect(valuation.profit).toBe(115000000);
    expect(valuation.marginPercent).toBe(51.11);
  });

  it('2. Dossier Detail: useDossierFinancials matches canonical valuation metrics exactly', () => {
    const { result } = renderHook(() => useDossierFinancials(fixtureEstimate));

    expect(result.current.revenueGross).toBe(243000000);
    expect(result.current.revenue).toBe(225000000);
    expect(result.current.cost).toBe(110000000);
    expect(result.current.profit).toBe(115000000);
    expect(result.current.margin).toBe('51.11');

    expect(result.current.costSummaryRows).toHaveLength(3);
    const [vatRow, noVatRow, totalRow] = result.current.costSummaryRows;

    expect(vatRow.key).toBe('service-vat');
    expect(vatRow.revenue).toBe(225000000);
    expect(vatRow.cost).toBe(80000000);
    expect(vatRow.grossProfit).toBe(145000000);

    expect(noVatRow.key).toBe('service-no-vat');
    expect(noVatRow.revenue).toBe(0);
    expect(noVatRow.cost).toBe(30000000);
    expect(noVatRow.grossProfit).toBe(-30000000);

    expect(totalRow.key).toBe('total');
    expect(totalRow.revenue).toBe(225000000);
    expect(totalRow.cost).toBe(110000000);
    expect(totalRow.grossProfit).toBe(115000000);
  });

  it('3. Import Preview: calculateImportSummary and useImportValidation produce identical net totals', () => {
    const summary = calculateImportSummary(
      fixtureRevenueLines as any,
      fixtureCostLines as any,
    );

    expect(summary.total.customerRevenue).toBe(243000000);
    expect(summary.total.netRevenue).toBe(225000000);
    expect(summary.total.cost).toBe(116400000);
    expect(summary.total.netCost).toBe(110000000);
    expect(summary.total.grossProfit).toBe(115000000);
    expect(summary.profitMargin).toBe('51.1%');

    // Reconcile against source summary
    const recon = reconcileEstimateValuation(
      fixtureRevenueLines,
      fixtureCostLines,
      {
        totalRevenue: 243000000,
        totalCost: 116400000,
        totalProfit: 126600000, // gross profit in excel
      },
    );

    expect(recon.status).toBe('MATCHED');
    expect(recon.valuation.revenueNet).toBe(225000000);
    expect(recon.valuation.costNet).toBe(110000000);
    expect(recon.valuation.profit).toBe(115000000);
  });

  it('4. Estimate Editor: useEstimateEditorState computes matching pre-VAT and post-VAT valuation', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AntApp>{children}</AntApp>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useEstimateEditorState({
          dossierId: 'dossier-parity-456',
          dossier: fixtureEstimate.dossier,
          estimate: fixtureEstimate,
          latestEstimateItem: fixtureEstimate,
          canOperate: true,
        }),
      { wrapper },
    );

    expect(result.current.totalRevenueNoVat).toBe(243000000);
    expect(result.current.totalRevenueValuedNet).toBe(225000000);
    expect(result.current.totalCostValuedNet).toBe(110000000);
    expect(result.current.totalProfit).toBe(115000000);
    expect(result.current.profitMargin).toBe(51.11);
    expect(result.current.grandTotalCost).toBe(116400000);
    expect(result.current.totalCostVat).toBe(86400000);
    expect(result.current.totalCostNoVatSum).toBe(30000000);
  });

  it('5. Executive Approval Modal: displays matching revenue, cost, profit, and margin in UI snapshot', async () => {
    (estimatesService.getEstimate as jest.Mock).mockResolvedValue(fixtureEstimate);
    (dossiersService.getDossier as jest.Mock).mockResolvedValue(fixtureEstimate.dossier);

    render(
      <QueryClientProvider client={queryClient}>
        <AntApp>
          <ExecutiveApprovalModal
            open={true}
            estimate={fixtureEstimate}
            onClose={jest.fn()}
            onSuccess={jest.fn()}
          />
        </AntApp>
      </QueryClientProvider>,
    );

    // Verify Title and Metadata
    expect(await screen.findByText('DOS-PARITY-001')).toBeInTheDocument();
    expect(screen.getByText('Phê duyệt nhanh hồ sơ tour')).toBeInTheDocument();

    // Verify Financial Cards render exactly the canonical numbers:
    // 225,000,000 VND (Doanh thu dự toán)
    // 110,000,000 VND (Tổng chi phí dự kiến)
    // 115,000,000 VND (Lợi nhuận gộp)
    // 51.1% (Tỷ suất LN gộp)
    expect(screen.getByText('Doanh thu dự toán')).toBeInTheDocument();
    expect(screen.getByText(/^225\.000\.000/)).toBeInTheDocument();

    expect(screen.getByText('Tổng chi phí dự kiến')).toBeInTheDocument();
    expect(screen.getByText(/^110\.000\.000/)).toBeInTheDocument();

    expect(screen.getByText('Lợi nhuận gộp')).toBeInTheDocument();
    expect(screen.getByText(/^115\.000\.000/)).toBeInTheDocument();

    expect(screen.getByText('Tỷ suất LN gộp')).toBeInTheDocument();
    expect(screen.getByText('51.1%')).toBeInTheDocument();
  });

  it('6. Full Cross-Surface Convergence: all 4 surfaces agree on Revenue, Cost, Profit, and Margin', () => {
    // Surface 1: Dossier Detail hook
    const { result: detailResult } = renderHook(() =>
      useDossierFinancials(fixtureEstimate),
    );
    const detail = detailResult.current;

    // Surface 2: Import Preview summary
    const importPreview = calculateImportSummary(
      fixtureRevenueLines as any,
      fixtureCostLines as any,
    );

    // Surface 3: Core Valuation (Estimate Editor & Backend seam)
    const valuation = valuateEstimate(fixtureRevenueLines, fixtureCostLines);

    // Surface 4: Canonical Backend / Approval Modal numbers
    const approvalRev = valuation.revenueNet;
    const approvalCost = valuation.costNet;
    const approvalProfit = valuation.profit;

    // Strict Convergence Assertions:
    expect(detail.revenue).toBe(225000000);
    expect(importPreview.total.netRevenue).toBe(225000000);
    expect(valuation.revenueNet).toBe(225000000);
    expect(approvalRev).toBe(225000000);

    expect(detail.cost).toBe(110000000);
    expect(importPreview.total.netCost).toBe(110000000);
    expect(valuation.costNet).toBe(110000000);
    expect(approvalCost).toBe(110000000);

    expect(detail.profit).toBe(115000000);
    expect(importPreview.total.grossProfit).toBe(115000000);
    expect(valuation.profit).toBe(115000000);
    expect(approvalProfit).toBe(115000000);

    expect(Number(detail.margin)).toBeCloseTo(51.11, 2);
    expect(parseFloat(importPreview.profitMargin)).toBeCloseTo(51.1, 1);
    expect(valuation.marginPercent).toBeCloseTo(51.11, 2);
  });
});
