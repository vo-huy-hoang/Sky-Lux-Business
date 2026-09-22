import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DossierDetailTabs } from '@/components/dossiers/detail/components/DossierDetailTabs';
import { useDossierUIStore } from '@/components/dossiers/detail/stores/useDossierUIStore';

// Mock matchMedia and ResizeObserver for Ant Design components
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

// Mock sub-tabs and tables with identifiable test-ids to verify lazy mounting and duplicate prevention
jest.mock('@/components/documents/DossierDocumentsTab', () => {
  function MockDocumentsTab({ isActive }: { isActive?: boolean }) {
    return (
      <div data-testid="documents-tab" data-active={String(isActive)}>
        Documents Content
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
        Comments Content
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
        Payments Content
      </div>
    );
  }
  return {
    __esModule: true,
    default: MockPaymentsTab,
  };
});

jest.mock('@/components/dossiers/detail/components/DossierRevenueTable', () => {
  return {
    DossierRevenueTable: function MockRevenueTable() {
      return <div data-testid="revenue-table">Revenue Table Instance</div>;
    },
  };
});

jest.mock('@/components/dossiers/detail/components/DossierCostTable', () => {
  return {
    DossierCostTable: function MockCostTable() {
      return <div data-testid="cost-table">Cost Table Instance</div>;
    },
    classifyCategory: () => ({ code: '1.1', title: 'Default', order: 1 }),
  };
});

jest.mock('@/components/dossiers/detail/components/CostSummaryTable', () => {
  return {
    CostSummaryTable: function MockCostSummaryTable() {
      return <div data-testid="cost-summary-table">Cost Summary Table</div>;
    },
    calculateCostSummaryRows: () => [],
  };
});

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});

afterEach(() => {
  testQueryClient.clear();
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>,
  );
};

describe('DossierDetailTabs (Phase 49 Lazy Mounting & Duplicate Render Elimination)', () => {
  const mockEstimate = {
    id: 'est-123',
    versionNo: 1,
    revenueLines: [{ id: 'rev-1', amount: 10000000 }],
    costLines: [{ id: 'cost-1', amount: 5000000 }],
  };

  const mockDossier = {
    id: 'dos-123',
    code: 'HS-2026-001',
    businessLine: { code: 'TOUR_INBOUND', name: 'Tour Quốc tế Inbound' },
    marketType: { name: 'Khách lẻ' },
  };

  beforeEach(() => {
    useDossierUIStore.getState().resetUIState();
  });

  it('TICKET-49.1: mounts only Overview tab content initially and gates heavy sub-tabs', () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    // Overview tables should be mounted
    expect(screen.getByTestId('revenue-table')).toBeInTheDocument();
    expect(screen.getByTestId('cost-table')).toBeInTheDocument();
    expect(screen.getByTestId('cost-summary-table')).toBeInTheDocument();

    // Heavy tabs MUST NOT be mounted in DOM on initial open
    expect(screen.queryByTestId('documents-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comments-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payments-tab')).not.toBeInTheDocument();
  });

  it('TICKET-49.2: prevents duplicate table instances in DOM', () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    // Exactly 1 instance of RevenueTable and 1 instance of CostTable on overview
    const revenueTables = screen.getAllByTestId('revenue-table');
    const costTables = screen.getAllByTestId('cost-table');

    expect(revenueTables).toHaveLength(1);
    expect(costTables).toHaveLength(1);
  });

  it('TICKET-49.2: mounts only Revenue table when switching to revenue tab (no duplicate Cost table)', () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    act(() => {
      useDossierUIStore.getState().setActiveTab('revenue');
    });

    expect(screen.getByTestId('revenue-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('revenue-table')).toHaveLength(1);
    expect(screen.queryByTestId('cost-table')).not.toBeInTheDocument();
  });

  it('TICKET-49.2: mounts only Cost table when switching to cost tab (no duplicate Revenue table)', () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    act(() => {
      useDossierUIStore.getState().setActiveTab('cost');
    });

    expect(screen.getByTestId('cost-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('cost-table')).toHaveLength(1);
    expect(screen.queryByTestId('revenue-table')).not.toBeInTheDocument();
  });

  it('TICKET-49.1, TICKET-49.3 & TICKET-50.1: mounts DocumentsTab on demand with isActive=true when visited', async () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    expect(screen.queryByTestId('documents-tab')).not.toBeInTheDocument();

    act(() => {
      useDossierUIStore.getState().setActiveTab('documents');
    });

    const docTab = await screen.findByTestId('documents-tab');
    expect(docTab).toBeInTheDocument();
    expect(docTab).toHaveAttribute('data-active', 'true');
  });

  it('TICKET-49.1, TICKET-49.3 & TICKET-50.2: mounts CommentsTab on demand with isActive=true', async () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    act(() => {
      useDossierUIStore.getState().setActiveTab('discussion');
    });

    const commentsTab = await screen.findByTestId('comments-tab');
    expect(commentsTab).toBeInTheDocument();
    expect(commentsTab).toHaveAttribute('data-active', 'true');
  });

  it('TICKET-49.1, TICKET-49.3 & TICKET-50.3: mounts PaymentsTab on demand with isActive=true', async () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    act(() => {
      useDossierUIStore.getState().setActiveTab('payments');
    });

    const paymentsTab = await screen.findByTestId('payments-tab');
    expect(paymentsTab).toBeInTheDocument();
    expect(paymentsTab).toHaveAttribute('data-active', 'true');
  });

  it('TICKET-49.1 & TICKET-49.3: preserves visited tab state and sets isActive=false when navigating away', async () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={mockEstimate}
        dossierId="dos-123"
        dossier={mockDossier}
      />,
    );

    // Visit documents tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('documents');
    });
    const docTab = await screen.findByTestId('documents-tab');
    expect(docTab).toHaveAttribute('data-active', 'true');

    // Switch back to overview tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('overview');
    });

    // Overview tables are back
    expect(screen.getByTestId('revenue-table')).toBeInTheDocument();
    expect(screen.getByTestId('cost-table')).toBeInTheDocument();

    // DocumentsTab is still preserved in DOM (visited) but marked isActive=false to pause queries
    expect(docTab).toBeInTheDocument();
    expect(docTab).toHaveAttribute('data-active', 'false');
  });

  it('TICKET-53.2: renders Tabs container and keeps Documents, Discussion, Payments accessible when estimate is undefined', async () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={undefined}
        dossierId="dos-draft-001"
        dossier={mockDossier}
      />,
    );

    // Overview should display Empty state for financial data
    expect(screen.getByText('Hồ sơ chưa có dữ liệu dự toán')).toBeInTheDocument();

    // Tabs container is rendered, user can switch to documents tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('documents');
    });

    const docTab = await screen.findByTestId('documents-tab');
    expect(docTab).toBeInTheDocument();
    expect(docTab).toHaveAttribute('data-active', 'true');

    // Switch to discussion tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('discussion');
    });
    const commentsTab = await screen.findByTestId('comments-tab');
    expect(commentsTab).toBeInTheDocument();
    expect(commentsTab).toHaveAttribute('data-active', 'true');

    // Switch to payments tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('payments');
    });
    const paymentsTab = await screen.findByTestId('payments-tab');
    expect(paymentsTab).toBeInTheDocument();
    expect(paymentsTab).toHaveAttribute('data-active', 'true');
  });

  it('TICKET-53.2: displays Empty state on Revenue and Cost subtabs when estimate is undefined', () => {
    renderWithProviders(
      <DossierDetailTabs
        estimate={undefined}
        dossierId="dos-draft-001"
        dossier={mockDossier}
      />,
    );

    // Switch to revenue tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('revenue');
    });
    expect(screen.getByText('Hồ sơ chưa có dữ liệu dự toán')).toBeInTheDocument();
    expect(screen.queryByTestId('revenue-table')).not.toBeInTheDocument();

    // Switch to cost tab
    act(() => {
      useDossierUIStore.getState().setActiveTab('cost');
    });
    expect(screen.getByText('Hồ sơ chưa có dữ liệu dự toán')).toBeInTheDocument();
    expect(screen.queryByTestId('cost-table')).not.toBeInTheDocument();
  });
});
