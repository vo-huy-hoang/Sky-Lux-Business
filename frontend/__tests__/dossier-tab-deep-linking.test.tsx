import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DossierDetailView from '@/components/dossiers/DossierDetailView';
import { useDossierUIStore } from '@/components/dossiers/detail/stores/useDossierUIStore';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { workflowService } from '@/services/workflow.service';
import { paymentsService } from '@/services/payments.service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { EstimateStatus } from '@/types/estimate';

// Mock matchMedia and ResizeObserver
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
        Documents Tab Content
      </div>
    );
  }
  return { __esModule: true, default: MockDocumentsTab };
});

jest.mock('@/app/(main)/dossiers/components/DossierComments', () => {
  function MockComments({ isActive }: { isActive?: boolean }) {
    return (
      <div data-testid="comments-tab" data-active={String(isActive)}>
        Comments Tab Content
      </div>
    );
  }
  return { __esModule: true, default: MockComments, DossierComments: MockComments };
});

jest.mock('@/components/dossiers/detail/components/DossierPaymentsTab', () => {
  function MockPaymentsTab({ isActive }: { isActive?: boolean }) {
    return (
      <div data-testid="payments-tab" data-active={String(isActive)}>
        Payments Tab Content
      </div>
    );
  }
  return { __esModule: true, default: MockPaymentsTab };
});

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
  },
}));

jest.mock('@/services/payments.service', () => ({
  paymentsService: {
    getFinanceSummary: jest.fn(),
    getPaymentsByDossier: jest.fn(),
  },
}));

const mockDossier = {
  id: 'dos-101',
  code: 'HS-2026-001',
  name: 'Tour Hà Nội - Hạ Long 3N2Đ',
  status: 'IN_PROGRESS',
  startDate: '2026-11-01',
  endDate: '2026-11-03',
  customerCount: 20,
  organizationId: 'org-1',
};

const mockEstimate = {
  id: 'est-101',
  dossierId: 'dos-101',
  status: EstimateStatus.DRAFT,
  version: 1,
  currency: 'VND',
  revenueLines: [],
  costLines: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('Dossier Tab Deep-Linking Integration Suite (Ticket 02)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-operator',
        name: 'Trần Điều Hành',
        email: 'operator@skylux.com',
        roles: ['OPERATOR'],
        permissions: ['dossier.view', 'estimate.view'],
      } as any,
      isAuthenticated: true,
      hasHydrated: true,
    });

    (dossiersService.getDossier as jest.Mock).mockResolvedValue(mockDossier);
    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValue([mockEstimate]);
    (estimatesService.getEstimate as jest.Mock).mockResolvedValue(mockEstimate);
    (workflowService.getWorkflowHistory as jest.Mock).mockResolvedValue({ data: [] });
    (paymentsService.getFinanceSummary as jest.Mock).mockResolvedValue({ data: {} });
    (paymentsService.getPaymentsByDossier as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('activates the cost tab when initialTab="cost" is provided', async () => {
    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-101" initialTab="cost" />, { wrapper });

    await waitFor(() => {
      expect(useDossierUIStore.getState().activeTab).toBe('cost');
    });

    expect(useDossierUIStore.getState().visitedTabs['cost']).toBe(true);
  });

  it('activates the revenue tab when initialTab="revenue" is provided', async () => {
    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-101" initialTab="revenue" />, { wrapper });

    await waitFor(() => {
      expect(useDossierUIStore.getState().activeTab).toBe('revenue');
    });

    expect(useDossierUIStore.getState().visitedTabs['revenue']).toBe(true);
  });

  it('defaults gracefully to overview tab when initialTab is invalid', async () => {
    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-101" initialTab="invalid-tab-name" />, { wrapper });

    await waitFor(() => {
      expect(useDossierUIStore.getState().activeTab).toBe('overview');
    });
  });

  it('defaults gracefully to overview tab when initialTab is omitted', async () => {
    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-101" />, { wrapper });

    await waitFor(() => {
      expect(useDossierUIStore.getState().activeTab).toBe('overview');
    });
  });

  it('switches activeTab when initialTab prop updates', async () => {
    const wrapper = createWrapper();
    const { rerender } = render(
      <DossierDetailView dossierId="dos-101" initialTab="cost" />,
      { wrapper },
    );

    await waitFor(() => {
      expect(useDossierUIStore.getState().activeTab).toBe('cost');
    });

    rerender(<DossierDetailView dossierId="dos-101" initialTab="payments" />);

    await waitFor(() => {
      expect(useDossierUIStore.getState().activeTab).toBe('payments');
    });
    expect(useDossierUIStore.getState().visitedTabs['payments']).toBe(true);
  });
});
