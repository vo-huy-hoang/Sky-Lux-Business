import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CeoDashboard from '@/components/ceo/CeoDashboard';
import { useCeoDashboard, useCeoMonthlyTrend } from '@/hooks/dashboards';

jest.mock('next/link', () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

jest.mock('@/components/ceo/RevenueDonutChart', () => ({
  RevenueDonutChart: () => <div data-testid="revenue-donut-chart" />,
  getRevenueDonutSlices: () => [],
}));

jest.mock('@/components/ceo/RevenueBreakdownToggle', () => ({
  RevenueBreakdownToggle: () => <div data-testid="revenue-breakdown-toggle" />,
  RevenueBreakdownMode: { MARKET: 'MARKET', BUSINESS_LINE: 'BUSINESS_LINE' },
}));

jest.mock('@/components/ceo/widgets/CeoExportActions', () => () => <div data-testid="ceo-export-actions" />);
jest.mock('@/components/ceo/widgets/CeoMetricsGrid', () => () => <div data-testid="ceo-metrics-grid" />);
jest.mock('@/components/ceo/widgets/CeoRevenueTrendWidget', () => () => <div data-testid="ceo-revenue-trend-widget" />);
jest.mock('@/components/ceo/widgets/CeoPerformanceTable', () => ({
  CeoDossiersTable: () => <div data-testid="ceo-dossiers-table" />,
}));

jest.mock('@/hooks/dashboards', () => ({
  useCeoDashboard: jest.fn(),
  useCeoMonthlyTrend: jest.fn(),
}));

jest.mock('@/hooks/useNotificationsRealtime', () => ({
  useNotificationsQuery: jest.fn(() => ({ data: { data: [] }, isLoading: false })),
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossiers: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 6, total: 0, totalPages: 0 } }),
  },
}));

jest.mock('@/services/estimates.service', () => ({
  estimatesService: {
    getEstimates: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('CeoDashboard - Supplier Spend Widget (Ticket 02)', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (useCeoMonthlyTrend as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  });

  it('renders top suppliers, "Các nhà cung cấp khác" row, and grand total when long-tail exists', () => {
    (useCeoDashboard as jest.Mock).mockReturnValue({
      data: {
        supplierSpendSummary: {
          items: [
            {
              supplierId: 'sup-1',
              supplierCode: 'SUP-001',
              supplierName: 'Khách sạn Melia Hà Nội',
              amount: 50000000,
              dossierCount: 4,
              sharePercentage: 50.0,
            },
            {
              supplierId: 'sup-2',
              supplierCode: 'SUP-002',
              supplierName: 'Vietnam Airlines',
              amount: 30000000,
              dossierCount: 2,
              sharePercentage: 30.0,
            },
          ],
          totalSpend: 100000000,
          otherSuppliersSpend: 20000000,
          otherSuppliersCount: 5,
          totalSupplierCount: 7,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CeoDashboard />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Doanh thu Nhà cung cấp')).toBeInTheDocument();
    expect(screen.getByText('Top 2 / 7 NCC')).toBeInTheDocument();
    expect(screen.getByText('Khách sạn Melia Hà Nội')).toBeInTheDocument();
    expect(screen.getByText('Vietnam Airlines')).toBeInTheDocument();

    // Long-tail row
    expect(screen.getByText('Các nhà cung cấp khác')).toBeInTheDocument();
    expect(screen.getByText('+5 đối tác ngoài Top 6')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();

    // Footer grand total & CTA link
    expect(screen.getByText('Tổng chi phí toàn bộ NCC:')).toBeInTheDocument();
    expect(screen.getByText('100 Tr')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Xem tất cả NCC/i });
    expect(link).toHaveAttribute('href', '/suppliers');
  });

  it('does not render "Các nhà cung cấp khác" when otherSuppliersCount is 0', () => {
    (useCeoDashboard as jest.Mock).mockReturnValue({
      data: {
        supplierSpendSummary: {
          items: [
            {
              supplierId: 'sup-1',
              supplierCode: 'SUP-001',
              supplierName: 'Khách sạn Novotel',
              amount: 40000000,
              dossierCount: 3,
              sharePercentage: 100.0,
            },
          ],
          totalSpend: 40000000,
          otherSuppliersSpend: 0,
          otherSuppliersCount: 0,
          totalSupplierCount: 1,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CeoDashboard />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Top 1 NCC')).toBeInTheDocument();
    expect(screen.getByText('Khách sạn Novotel')).toBeInTheDocument();
    expect(screen.queryByText('Các nhà cung cấp khác')).not.toBeInTheDocument();
    expect(screen.getByText('Tổng chi phí toàn bộ NCC:')).toBeInTheDocument();
    expect(screen.getAllByText('40 Tr')).toHaveLength(2);
  });

  it('anchors Top 1 supplier bar at 100% width even when otherSuppliersSpend is significantly higher', () => {
    (useCeoDashboard as jest.Mock).mockReturnValue({
      data: {
        supplierSpendSummary: {
          items: [
            {
              supplierId: 'sup-1',
              supplierCode: 'SUP-001',
              supplierName: 'Vinpearl Luxury Nha Trang',
              amount: 150000000,
              dossierCount: 10,
              sharePercentage: 23.1,
            },
            {
              supplierId: 'sup-2',
              supplierCode: 'SUP-002',
              supplierName: 'Mường Thanh Grand',
              amount: 75000000,
              dossierCount: 5,
              sharePercentage: 11.5,
            },
          ],
          totalSpend: 650000000,
          otherSuppliersSpend: 425000000,
          otherSuppliersCount: 25,
          totalSupplierCount: 27,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CeoDashboard />
      </QueryClientProvider>,
    );

    // Verify Top 1 bar is anchored at 100% width
    const top1ProgressBar = screen.getByRole('progressbar', {
      name: /Vinpearl Luxury Nha Trang: 23\.1%/i,
    });
    expect(top1ProgressBar).toHaveAttribute('aria-valuenow', '100');
    expect(top1ProgressBar.firstElementChild).toHaveStyle({ width: '100%' });

    // Verify Top 2 bar is scaled relatively to Top 1 (75M / 150M = 50%)
    const top2ProgressBar = screen.getByRole('progressbar', {
      name: /Mường Thanh Grand: 11\.5%/i,
    });
    expect(top2ProgressBar).toHaveAttribute('aria-valuenow', '50');
    expect(top2ProgressBar.firstElementChild).toHaveStyle({ width: '50%' });

    // Verify otherSuppliers bar is bounded at 100%
    const otherProgressBar = screen.getByRole('progressbar', {
      name: /Các nhà cung cấp khác/i,
    });
    expect(otherProgressBar).toHaveAttribute('aria-valuenow', '100');
    expect(otherProgressBar.firstElementChild).toHaveStyle({ width: '100%' });
  });
});

