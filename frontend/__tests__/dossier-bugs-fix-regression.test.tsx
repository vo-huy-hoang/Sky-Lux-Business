import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import DossierDetailView from '@/components/dossiers/DossierDetailView';
import { DossierDetailTabs } from '@/components/dossiers/detail/components/DossierDetailTabs';
import { useDossierUIStore } from '@/components/dossiers/detail/stores/useDossierUIStore';
import { useDossierActiveEstimate } from '@/components/dossiers/detail/hooks/useDossierActiveEstimate';
import { useDossierFinancials } from '@/components/dossiers/detail/hooks/useDossierFinancials';
import { useDossierDetail } from '@/hooks/dossiers';
import { useDossierEstimates, useEstimateDetail } from '@/hooks/estimates';
import { formatCurrency, formatVndCurrency, parseCurrencyAmount } from '@/lib/financial-calculations';
import { WORKFLOW_ACTION_CONFIG, TIMELINE_ACTION_LABELS } from '@/components/dossiers/detail/types';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { workflowService } from '@/services/workflow.service';
import { paymentsService } from '@/services/payments.service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { EstimateStatus, EstimateItem } from '@/types/estimate';

// Mock icons
jest.mock('@ant-design/icons', () => ({
  TeamOutlined: () => <span data-testid="team-icon" />,
  FolderOpenOutlined: () => <span data-testid="folder-icon" />,
  ClockCircleOutlined: () => <span data-testid="clock-icon" />,
  CalendarOutlined: () => <span data-testid="calendar-icon" />,
  DollarOutlined: () => <span data-testid="dollar-icon" />,
  RiseOutlined: () => <span data-testid="rise-icon" />,
  WalletOutlined: () => <span data-testid="wallet-icon" />,
  WarningOutlined: () => <span data-testid="warning-icon" />,
  PayCircleOutlined: () => <span data-testid="pay-circle-icon" />,
  EditOutlined: () => <span data-testid="edit-icon" />,
  DownloadOutlined: () => <span data-testid="download-icon" />,
  ArrowLeftOutlined: () => <span data-testid="arrow-left-icon" />,
  CheckCircleOutlined: () => <span data-testid="check-circle-icon" />,
  LockOutlined: () => <span data-testid="lock-icon" />,
  RocketOutlined: () => <span data-testid="rocket-icon" />,
  SendOutlined: () => <span data-testid="send-icon" />,
  SyncOutlined: () => <span data-testid="sync-icon" />,
  MessageOutlined: () => <span data-testid="message-icon" />,
  UserOutlined: () => <span data-testid="user-icon" />,
  FileExcelOutlined: () => <span data-testid="excel-icon" />,
  FilePdfOutlined: () => <span data-testid="pdf-icon" />,
  BarChartOutlined: () => <span data-testid="bar-chart-icon" />,
  FileTextOutlined: () => <span data-testid="file-text-icon" />,
}));

// Mock dynamic sub-tabs
jest.mock('@/components/documents/DossierDocumentsTab', () => {
  function MockDocumentsTab({ isActive }: { isActive?: boolean }) {
    return (
      <div data-testid="documents-tab" data-active={String(isActive)}>
        Nội dung Tài liệu
      </div>
    );
  }
  return {
    __esModule: true,
    default: MockDocumentsTab,
  };
});

jest.mock('@/app/main/dossiers/components/DossierComments', () => {
  function MockComments({ isActive }: { isActive?: boolean }) {
    return (
      <div data-testid="comments-tab" data-active={String(isActive)}>
        Nội dung Bình luận
      </div>
    );
  }
  return {
    __esModule: true,
    default: MockComments,
    DossierComments: MockComments,
  };
});

jest.mock('@/components/dossiers/detail/components/DossierPaymentsTab', () => {
  function MockPaymentsTab({ isActive }: { isActive?: boolean }) {
    return (
      <div data-testid="payments-tab" data-active={String(isActive)}>
        Nội dung Thanh toán
      </div>
    );
  }
  return {
    __esModule: true,
    default: MockPaymentsTab,
  };
});

// Mock service APIs
jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossier: jest.fn(),
  },
}));

jest.mock('@/services/estimates.service', () => ({
  estimatesService: {
    getDossierEstimates: jest.fn(),
    getEstimate: jest.fn(),
  },
}));

jest.mock('@/services/workflow.service', () => ({
  workflowService: {
    getWorkflowHistory: jest.fn(),
    startReview: jest.fn(),
    approve: jest.fn(),
    requestChanges: jest.fn(),
    submit: jest.fn(),
    resubmit: jest.fn(),
    complete: jest.fn(),
    lock: jest.fn(),
  },
}));

jest.mock('@/services/payments.service', () => ({
  paymentsService: {
    getFinanceSummary: jest.fn(),
    getPaymentsByDossier: jest.fn(),
  },
}));

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

describe('Phase 56: Comprehensive Bugfix & Architecture Regression Suite', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AntdApp>{children}</AntdApp>
      </QueryClientProvider>
    );
  };

  const mockDossier = {
    id: 'dos-101',
    code: 'HS-2026-001',
    tourName: 'Tour Đà Nẵng 3N2D Luxury',
    name: 'Tour Đà Nẵng 3N2D Luxury',
    status: 'IN_REVIEW',
    customer: { id: 'cust-1', name: 'Công ty Du lịch Á Châu', displayName: 'Công ty Du lịch Á Châu' },
    businessLine: { id: 'bl-1', code: 'TOUR_INBOUND', name: 'Tour Inbound' },
    marketType: { id: 'mt-1', name: 'Khách đoàn' },
    paxCount: 25,
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    creator: { fullName: 'Nguyễn Văn Sales' },
    operator: { fullName: 'Trần Thị Điều Hành' },
    createdAt: '2026-05-15T08:00:00Z',
    updatedAt: '2026-05-16T10:00:00Z',
  };

  const mockEstimate = {
    id: 'est-v1',
    dossierId: 'dos-101',
    versionNo: 1,
    status: EstimateStatus.APPROVED,
    revenueLines: [
      { id: 'rev-1', description: 'Tour', quantity: 10, multiplier: 1, unitPrice: 10800000, grossAmount: 108000000 },
    ],
    costLines: [
      { id: 'cost-1', description: 'Khách sạn', quantity: 5, multiplier: 1, unitPrice: 10800000, grossAmount: 54000000, vatRate: 8 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useDossierUIStore.getState().resetUIState();
    useAuthStore.setState({
      user: { id: 'user-admin', role: 'ADMIN', fullName: 'Ban Giám Đốc' } as any,
    });

    (dossiersService.getDossier as jest.Mock).mockResolvedValue(mockDossier);
    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValue({
      data: [mockEstimate],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    (estimatesService.getEstimate as jest.Mock).mockResolvedValue(mockEstimate);
    (workflowService.getWorkflowHistory as jest.Mock).mockResolvedValue({ data: [] });
    (paymentsService.getFinanceSummary as jest.Mock).mockResolvedValue({
      data: { totalRevenue: 108000000, totalCost: 54000000, paidRevenue: 50000000, paidCost: 20000000 },
    });
    (paymentsService.getPaymentsByDossier as jest.Mock).mockResolvedValue({ data: [] });
  });

  // =========================================================================
  // BUG 1 REGRESSION: Zustand Store Lifecycle Reset
  // =========================================================================
  describe('Bug 1 Regression: Global UI Store Lifecycle Isolation', () => {
    it('resets activeTab, actionNote, and modalAction when switching dossiers or unmounting', async () => {
      const wrapper = createWrapper();

      // 1. Render DossierDetailView with dossier dos-101
      const { rerender, unmount } = render(<DossierDetailView dossierId="dos-101" />, { wrapper });

      await waitFor(() => {
        expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
      });

      // 2. User navigates to documents tab and prepares an approval note
      act(() => {
        useDossierUIStore.getState().setActiveTab('documents');
        useDossierUIStore.getState().setModalAction('APPROVE');
        useDossierUIStore.getState().setActionNote('Ghi chú phê duyệt hồ sơ 101');
      });

      expect(useDossierUIStore.getState().activeTab).toBe('documents');
      expect(useDossierUIStore.getState().modalAction).toBe('APPROVE');
      expect(useDossierUIStore.getState().actionNote).toBe('Ghi chú phê duyệt hồ sơ 101');

      // 3. User navigates to dossier dos-102
      (dossiersService.getDossier as jest.Mock).mockResolvedValue({
        ...mockDossier,
        id: 'dos-102',
        code: 'HS-2026-002',
      });

      rerender(<DossierDetailView dossierId="dos-102" />);

      // Verify that dossier dos-102 resets UI store back to initial overview state
      expect(useDossierUIStore.getState().activeTab).toBe('overview');
      expect(useDossierUIStore.getState().modalAction).toBeNull();
      expect(useDossierUIStore.getState().actionNote).toBe('');
      expect(useDossierUIStore.getState().visitedTabs).toEqual({ overview: true });

      // 4. Dirty the store again and test unmount cleanup
      act(() => {
        useDossierUIStore.getState().setActiveTab('discussion');
        useDossierUIStore.getState().setActionNote('Dirty note before leaving');
      });

      unmount();

      expect(useDossierUIStore.getState().activeTab).toBe('overview');
      expect(useDossierUIStore.getState().actionNote).toBe('');
    });
  });

  // =========================================================================
  // BUG 2 REGRESSION: Resilient Dossier Tabs Without Estimate
  // =========================================================================
  describe('Bug 2 Regression: Resilient Dossier Tabs Without Estimate', () => {
    it('allows accessing documents, discussion, and payments tabs when estimate is null', async () => {
      const wrapper = createWrapper();

      render(
        <DossierDetailTabs
          estimate={null}
          estimateLoading={false}
          dossierId="dos-no-est"
          dossier={mockDossier}
        />,
        { wrapper },
      );

      // The tab headers must be rendered
      expect(screen.getByRole('tab', { name: /thông tin chung/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tài liệu/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /trao đổi/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /thanh toán/i })).toBeInTheDocument();

      // Overview shows simple Empty placeholder instead of breaking
      expect(screen.getByText('Hồ sơ chưa có dữ liệu dự toán')).toBeInTheDocument();

      // Click "Tài liệu" tab: activates documents tab content
      fireEvent.click(screen.getByRole('tab', { name: /tài liệu/i }));
      expect(await screen.findByTestId('documents-tab')).toBeInTheDocument();

      // Click "Trao đổi" tab: activates comments tab content
      fireEvent.click(screen.getByRole('tab', { name: /trao đổi/i }));
      expect(await screen.findByTestId('comments-tab')).toBeInTheDocument();

      // Click "Thanh toán" tab: activates payments tab content
      fireEvent.click(screen.getByRole('tab', { name: /thanh toán/i }));
      expect(await screen.findByTestId('payments-tab')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // BUG 3 REGRESSION: Query Hook Safety Contract
  // =========================================================================
  describe('Bug 3 Regression: Query Hook Safety Contract with Enabled Overrides', () => {
    it('does not fire network queries when id is undefined/falsy even if { enabled: true } is passed', () => {
      const wrapper = createWrapper();

      // 1. useDossierDetail with undefined id and enabled: true
      const { result: dossierResult } = renderHook(
        () => useDossierDetail(undefined as any, { enabled: true }),
        { wrapper },
      );
      expect(dossiersService.getDossier).not.toHaveBeenCalled();
      expect(dossierResult.current.fetchStatus).toBe('idle');

      // 2. useEstimateDetail with empty string id and enabled: true
      const { result: estimateResult } = renderHook(
        () => useEstimateDetail('', { enabled: true }),
        { wrapper },
      );
      expect(estimatesService.getEstimate).not.toHaveBeenCalled();
      expect(estimateResult.current.fetchStatus).toBe('idle');

      // 3. useDossierEstimates with empty dossierId and enabled: true
      const { result: estimatesListResult } = renderHook(
        () => useDossierEstimates('', { enabled: true }),
        { wrapper },
      );
      expect(estimatesService.getDossierEstimates).not.toHaveBeenCalled();
      expect(estimatesListResult.current.fetchStatus).toBe('idle');
    });
  });

  // =========================================================================
  // BUG 4 REGRESSION: Stale Closure Fix in useDossierActiveEstimate
  // =========================================================================
  describe('Bug 4 Regression: Fresh Version Resolution in useDossierActiveEstimate.refetch()', () => {
    it('fetches new latest version details immediately on refetch() without using stale closure', async () => {
      const wrapper = createWrapper();

      const v1 = { id: 'est-1', dossierId: 'dos-1', versionNo: 1, status: EstimateStatus.DRAFT };
      const v2 = { id: 'est-2', dossierId: 'dos-1', versionNo: 2, status: EstimateStatus.SUBMITTED };

      // Initial: only v1 exists
      (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValueOnce({ data: [v1] });
      (estimatesService.getEstimate as jest.Mock).mockResolvedValueOnce(v1);

      const { result } = renderHook(() => useDossierActiveEstimate('dos-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.currentEstimate?.id).toBe('est-1');
        expect(result.current.currentEstimate?.versionNo).toBe(1);
      });

      // User creates v2 in background: next call returns [v1, v2]
      (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValueOnce({ data: [v1, v2] });
      (estimatesService.getEstimate as jest.Mock).mockResolvedValueOnce(v2);

      // Trigger refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Hook must now resolve to version 2 (est-2)
      await waitFor(() => {
        expect(result.current.currentEstimate?.id).toBe('est-2');
        expect(result.current.currentEstimate?.versionNo).toBe(2);
      });
    });
  });

  // =========================================================================
  // PHASE 55 ENHANCEMENTS REGRESSION: Seam & Formatting Consistency
  // =========================================================================
  describe('Phase 55 Architectural Refactoring Regression', () => {
    it('useDossierFinancials computes exactly 3 summary rows according to Excel divisor rules', () => {
      const sampleEstimate = {
        id: 'est-sample',
        versionNo: 1,
        revenueLines: [
          { quantity: 1, multiplier: 1, unitPrice: 10800000, grossAmount: 10800000 },
        ],
        costLines: [
          { description: 'Khách sạn', quantity: 1, multiplier: 1, unitPrice: 10800000, grossAmount: 10800000, vatRate: 8 },
        ],
      } as any as EstimateItem;

      const { result } = renderHook(() => useDossierFinancials(sampleEstimate));
      expect(result.current.costSummaryRows).toHaveLength(3);
      expect(result.current.costSummaryRows.map((r) => r.key)).toEqual([
        'service-vat',
        'service-no-vat',
        'total',
      ]);
    });

    it('formatVndCurrency formats all values consistently with " đ" suffix', () => {
      expect(formatVndCurrency(100000000)).toBe('100.000.000 đ');
      expect(formatVndCurrency(0)).toBe('0 đ');
      expect(formatVndCurrency(null)).toBe('0 đ');
      expect(formatVndCurrency(undefined)).toBe('0 đ');
      expect(formatVndCurrency('')).toBe('0 đ');
      expect(formatVndCurrency('5000000')).toBe('5.000.000 đ');
      expect(formatVndCurrency(-2500000)).toBe('-2.500.000 đ');
    });

    it('formatCurrency supports multi-currency (USD, EUR, JPY) and provides graceful fallback for unknown codes', () => {
      // VND defaults
      expect(formatCurrency(100000000)).toBe('100.000.000 đ');
      expect(formatCurrency(100000000, 'VND')).toBe('100.000.000 đ');
      expect(formatCurrency(0, 'VND')).toBe('0 đ');
      expect(formatCurrency(null, 'VND')).toBe('0 đ');

      // USD
      expect(formatCurrency(5000, 'USD')).toBe('$5,000.00');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(null, 'USD')).toBe('$0.00');

      // EUR
      expect(formatCurrency(1500, 'EUR')).toBe('€1,500.00');

      // JPY (zero decimal currency)
      expect(formatCurrency(500000, 'JPY')).toBe('¥500,000');

      // Safe fallback for irregular / test currency code (never throws RangeError)
      const irregular = formatCurrency(1234.56, 'XYZ');
      expect(irregular).toBeTruthy();
      expect(irregular).toMatch(/1,234\.56/);

      // TICKET-57.5: Negative Zero sanitization (khử hoàn toàn visual bug -0 đ)
      expect(formatCurrency(-0)).toBe('0 đ');
      expect(formatCurrency(Math.round(-0.2))).toBe('0 đ');
      expect(formatCurrency(-0.0001)).toBe('0 đ');

      // TICKET-57.5: Polymorphic Options & Compact formatting (hỗ trợ Dashboard/Charts)
      expect(formatCurrency(2500000000, { compact: true })).toBe('2.5 tỷ đ');
      expect(formatCurrency(35000000, { compact: true })).toBe('35 tr đ');
      expect(formatCurrency(50000, { compact: true })).toBe('50 k đ');
      expect(formatCurrency(null, { fallback: '-' })).toBe('-');
    });

    it('WORKFLOW_ACTION_CONFIG and TIMELINE_ACTION_LABELS provide complete descriptors for every action', () => {
      const actions = ['APPROVE', 'REQUEST_CHANGES', 'LOCK', 'COMPLETE'] as const;
      actions.forEach((action) => {
        const config = WORKFLOW_ACTION_CONFIG[action];
        expect(config).toBeDefined();
        expect(config.title).toBeTruthy();
        expect(config.okText).toBeTruthy();
        expect(config.color).toBeTruthy();
        expect(config.timelineLabel).toBeTruthy();

        const timelineMeta = TIMELINE_ACTION_LABELS[action];
        expect(timelineMeta).toBeDefined();
        expect(timelineMeta.label).toBe(config.timelineLabel);
      });
    });

    describe('Phase 59: Currency Engine Robustness, Parser & Multi-Currency', () => {
      it('parseCurrencyAmount parses Vietnamese, US, decimal, and accounting formats correctly', () => {
        // Vietnamese thousands with dot
        expect(parseCurrencyAmount('145.800.000')).toBe(145800000);
        expect(parseCurrencyAmount('100.000')).toBe(100000);
        expect(parseCurrencyAmount('145.800.000 đ')).toBe(145800000);
        expect(parseCurrencyAmount('Doanh thu nguồn: 145.800.000')).toBe(145800000);

        // US thousands with comma
        expect(parseCurrencyAmount('145,800,000')).toBe(145800000);
        expect(parseCurrencyAmount('$5,000.00')).toBe(5000);
        expect(parseCurrencyAmount('$ 12.50')).toBe(12.5);

        // Mixed decimals
        expect(parseCurrencyAmount('145.800.000,50')).toBe(145800000.5);
        expect(parseCurrencyAmount('145,800,000.50')).toBe(145800000.5);

        // Negative numbers
        expect(parseCurrencyAmount('-50.000')).toBe(-50000);
        expect(parseCurrencyAmount('(50.000)')).toBe(-50000);

        // Edge cases
        expect(parseCurrencyAmount('')).toBe(0);
        expect(parseCurrencyAmount(null)).toBe(0);
        expect(parseCurrencyAmount(undefined)).toBe(0);
        expect(parseCurrencyAmount(145800000)).toBe(145800000);
      });

      it('formatCurrency parses string inputs accurately without truncating numbers', () => {
        expect(formatCurrency('145.800.000')).toBe('145.800.000 đ');
        expect(formatCurrency('100,000,000')).toBe('100.000.000 đ');
      });

      it('formatCurrency supports showSymbol: false for Chart axes', () => {
        expect(formatCurrency(2500000000, { compact: true, showSymbol: false })).toBe('2.5 tỷ');
        expect(formatCurrency(35000000, { compact: true, showSymbol: false })).toBe('35 tr');
        expect(formatCurrency(50000, { compact: true, showSymbol: false })).toBe('50 k');
        expect(formatCurrency(500, { compact: true, showSymbol: false })).toBe('500');
        expect(formatCurrency(1000000, { showSymbol: false })).toBe('1.000.000');
        expect(formatCurrency(5000, { currency: 'USD', showSymbol: false })).toBe('5,000.00');
      });
    });
  });
});
