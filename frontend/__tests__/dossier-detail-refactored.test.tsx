import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DossierDetailView from '@/components/dossiers/DossierDetailView';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useDossierUIStore } from '@/components/dossiers/detail/stores/useDossierUIStore';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { workflowService } from '@/services/workflow.service';
import { paymentsService } from '@/services/payments.service';
import { EstimateStatus } from '@/types/estimate';

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
    getDossierPayments: jest.fn(),
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

describe('DossierDetailView Refactored Integration Test Suite (Phase 52 - TICKET-52.2)', () => {
  let queryClient: QueryClient;

  const mockDossierBase = {
    id: 'dos-123',
    code: 'HS-2026-001',
    name: 'Đoàn Khách VIP Đà Nẵng 5N4D',
    route: 'Hà Nội - Đà Nẵng - Hội An',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    status: 'IN_REVIEW',
    paxCount: 20,
    customer: {
      id: 'cust-1',
      code: 'KH-001',
      displayName: 'Công ty Cổ phần Du lịch ABC',
    },
    salesUser: {
      id: 'usr-sales',
      fullName: 'Nguyễn Văn Sales',
      email: 'sales@skylux.vn',
    },
    operatorUser: {
      id: 'usr-op',
      fullName: 'Trần Thị Điều Hành',
      email: 'operator@skylux.vn',
    },
  };

  const mockEstimate = {
    id: 'est-v2',
    dossierId: 'dos-123',
    versionNo: 2,
    status: EstimateStatus.SUBMITTED,
    revenueLines: [
      {
        id: 'rev-1',
        estimateId: 'est-v2',
        description: 'Tour trọn gói Đà Nẵng',
        quantity: 10,
        multiplier: 1,
        unitPrice: 10800000,
        grossAmount: 108000000,
        vatRate: 8,
      },
    ],
    costLines: [
      {
        id: 'cost-1',
        estimateId: 'est-v2',
        description: 'Khách sạn Mường Thanh Đà Nẵng',
        quantity: 5,
        multiplier: 1,
        unitPrice: 10800000,
        grossAmount: 54000000,
        vatRate: 8,
      },
      {
        id: 'cost-gala',
        estimateId: 'est-v2',
        description: 'Dịch vụ Gala Dinner',
        quantity: 1,
        multiplier: 1,
        unitPrice: 5000000,
        grossAmount: 5000000,
        vatRate: 10,
        categoryTitle: 'CÁC DỊCH VỤ KHÁC',
      },
    ],
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    useDossierUIStore.getState().resetUIState();

    (dossiersService.getDossier as jest.Mock).mockResolvedValue(mockDossierBase);
    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValue({
      data: [mockEstimate],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    (estimatesService.getEstimate as jest.Mock).mockResolvedValue(mockEstimate);
    (workflowService.getWorkflowHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'wf-1',
          dossierId: 'dos-123',
          action: 'SUBMIT',
          fromStatus: 'DRAFT',
          toStatus: 'IN_REVIEW',
          actorName: 'Nguyễn Văn Sales',
          createdAt: '2026-09-18T10:00:00Z',
        },
      ],
    });
    (paymentsService.getFinanceSummary as jest.Mock).mockResolvedValue({
      data: {
        totalRevenue: 108000000,
        totalCost: 50000000,
        paidRevenue: 108000000,
        paidCost: 20000000,
      },
    });
  });

  it('Kịch bản 1 (OPERATOR Role): Render đầy đủ thông tin điều hành và các nút phê duyệt', async () => {
    useAuthStore.setState({
      user: { id: 'usr-op', fullName: 'Trần Thị Điều Hành', roles: ['OPERATOR'] } as any,
      isAuthenticated: true,
    });

    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-123" />, { wrapper });

    // Header & breadcrumb
    await waitFor(() => {
      expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Hà Nội - Đà Nẵng - Hội An')).toBeInTheDocument();

    // Summary cards
    expect(screen.getByText('Công ty Cổ phần Du lịch ABC')).toBeInTheDocument();
    expect(screen.getAllByText('Trần Thị Điều Hành').length).toBeGreaterThan(0);

    // Operator Notes Card
    expect(screen.getByText('Ghi chú từ điều hành')).toBeInTheDocument();

    // Action Bar: OPERATOR with IN_REVIEW should see "Duyệt hồ sơ" and "Yêu cầu bổ sung"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /duyệt hồ sơ/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /yêu cầu bổ sung/i })).toBeInTheDocument();

    // OPERATOR should NOT see CEO "Khóa hồ sơ" button
    expect(screen.queryByRole('button', { name: /khóa hồ sơ/i })).not.toBeInTheDocument();
  });

  it('Kịch bản 2 (CEO / SUPER_ADMIN Role): Render đúng thẻ chỉ số CEO và nút khóa hồ sơ khi APPROVED', async () => {
    useAuthStore.setState({
      user: { id: 'usr-ceo', fullName: 'Lê Giám Đốc', roles: ['CEO_ADMIN'] } as any,
      isAuthenticated: true,
    });

    (dossiersService.getDossier as jest.Mock).mockResolvedValue({
      ...mockDossierBase,
      status: 'APPROVED',
    });

    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-123" />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
    });

    // CEO Card styling classes
    const ceoCards = document.querySelectorAll('.ceo-card');
    expect(ceoCards.length).toBeGreaterThan(0);

    // Action Bar: CEO should see "Khóa hồ sơ" when APPROVED
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /khóa hồ sơ/i })).toBeInTheDocument();
    });
  });

  it('Kịch bản 3 (Active-Tab Lazy Mounting): Chỉ mount tab Overview ban đầu, các heavy sub-tabs chỉ mount khi được click', async () => {
    useAuthStore.setState({
      user: { id: 'usr-op', roles: ['OPERATOR'] } as any,
      isAuthenticated: true,
    });

    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-123" />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
    });

    // Overview tables are mounted
    await waitFor(() => {
      expect(screen.getByText(/chi tiết doanh thu/i)).toBeInTheDocument();
      expect(screen.getAllByText(/dịch vụ đầu vào có vat/i).length).toBeGreaterThan(0);
    });

    // Heavy dynamic sub-tabs are NOT mounted in DOM yet!
    expect(screen.queryByTestId('documents-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comments-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payments-tab')).not.toBeInTheDocument();

    // Switch to Documents tab via state
    act(() => {
      useDossierUIStore.getState().setActiveTab('documents');
    });

    // Now documents tab is mounted
    const documentsTab = await screen.findByTestId('documents-tab');
    expect(documentsTab).toBeInTheDocument();
    expect(documentsTab).toHaveAttribute('data-active', 'true');

    // Switch to Discussion (Trao đổi) tab via state
    act(() => {
      useDossierUIStore.getState().setActiveTab('discussion');
    });

    // Now comments tab is mounted
    const commentsTab = await screen.findByTestId('comments-tab');
    expect(commentsTab).toBeInTheDocument();
    expect(commentsTab).toHaveAttribute('data-active', 'true');

    // Documents tab remains retained in DOM but marked inactive (data-active=false)
    expect(screen.getByTestId('documents-tab')).toHaveAttribute('data-active', 'false');
  });

  it('Kịch bản 4 (Financial Calculations & VAT Seam): Tính đúng doanh thu thuần chia 1.08, cộng toàn bộ mục I và margin', async () => {
    useAuthStore.setState({
      user: { id: 'usr-op', roles: ['OPERATOR'] } as any,
      isAuthenticated: true,
    });

    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-123" />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
    });

    // Doanh thu gộp: 108,000,000 -> Doanh thu thuần (chia 1.08): 100,000,000 đ
    // Chi phí: (54,000,000 + 5,000,000) / 1.08 = 54,629,629.63 đ
    // Lợi nhuận gộp = 100,000,000 - 54,629,629.63 = 45,370,370.37 đ
    // Tỷ suất lợi nhuận (margin) = 45.37%
    await waitFor(() => {
      expect(screen.getAllByText(/100\.000\.000/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/54\.629\.630/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/45\.37%/).length).toBeGreaterThan(0);
    });
  });

  it('Kịch bản 5 (Workflow Action Modal): Mở modal phê duyệt khi click nút Duyệt hồ sơ', async () => {
    useAuthStore.setState({
      user: { id: 'usr-op', roles: ['OPERATOR'] } as any,
      isAuthenticated: true,
    });

    const wrapper = createWrapper();
    render(<DossierDetailView dossierId="dos-123" />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
    });

    // Wait for button "Duyệt hồ sơ" to be ready
    const approveBtn = await screen.findByRole('button', { name: /duyệt hồ sơ/i });
    fireEvent.click(approveBtn);

    // Modal pops up with title
    await waitFor(() => {
      expect(screen.getByText(/xác nhận phê duyệt hồ sơ tour/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/nhập ghi chú hoặc lời nhắn nội bộ/i)).toBeInTheDocument();
  });

  it('TICKET-53.1: isolates UI store state and resets activeTab and modal when unmounting or switching dossiers', async () => {
    useAuthStore.setState({
      user: { id: 'usr-op', roles: ['OPERATOR'] } as any,
      isAuthenticated: true,
    });

    // Manually dirty the UI store before mounting
    act(() => {
      useDossierUIStore.getState().setActiveTab('documents');
      useDossierUIStore.getState().setModalAction('APPROVE');
      useDossierUIStore.getState().setActionNote('Ghi chú cũ rò rỉ');
    });

    const wrapper = createWrapper();
    const { unmount } = render(<DossierDetailView dossierId="dos-123" />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('HS-2026-001').length).toBeGreaterThan(0);
    });

    // On mount with dossierId, UI store must be cleanly reset to overview
    expect(useDossierUIStore.getState().activeTab).toBe('overview');
    expect(useDossierUIStore.getState().modalAction).toBeNull();
    expect(useDossierUIStore.getState().actionNote).toBe('');

    // Dirty state while on this dossier
    act(() => {
      useDossierUIStore.getState().setActiveTab('payments');
      useDossierUIStore.getState().setActionNote('Ghi chú thanh toán');
    });
    expect(useDossierUIStore.getState().activeTab).toBe('payments');

    // Unmount DossierDetailView
    unmount();

    // Store must be reset on unmount
    expect(useDossierUIStore.getState().activeTab).toBe('overview');
    expect(useDossierUIStore.getState().actionNote).toBe('');
    expect(useDossierUIStore.getState().visitedTabs).toEqual({ overview: true });
  });
});
