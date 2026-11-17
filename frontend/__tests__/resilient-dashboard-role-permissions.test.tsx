import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OperationalDashboard } from '@/components/dashboard/OperationalDashboard';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSalesDashboard, useOperatorDashboard } from '@/hooks/dashboards';
import { dossiersService } from '@/services/dossiers.service';

jest.mock('@/hooks/dashboards', () => ({
  useSalesDashboard: jest.fn(),
  useOperatorDashboard: jest.fn(),
  useOperatorMonthlyTrend: jest.fn(() => ({ data: [], isLoading: false })),
  useOperatorSalesSummary: jest.fn(() => ({ data: [], isLoading: false })),
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossiers: jest.fn(),
  },
}));

jest.mock('@/components/dossiers/DossierOperationalCharts', () => {
  return function MockOperationalCharts() {
    return <div data-testid="mock-operational-charts">Charts</div>;
  };
});

describe('Ticket 01: IAM Baseline Role Permissions & Resilient Dashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderDashboard = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <OperationalDashboard />
      </QueryClientProvider>,
    );

  it('renders gentle inline fallback and does NOT crash dashboard when sales stats return 403 / error', async () => {
    // Setup authenticated SALES user
    useAuthStore.setState({
      user: {
        id: 'sales-1',
        email: 'sales@skylux.vn',
        fullName: 'Nguyễn Văn Sales',
        organizationId: 'org-1',
      } as any,
      hasRole: (role: string | string[]) => {
        if (Array.isArray(role)) return role.includes('SALES');
        return role === 'SALES';
      },
    });

    // Mock sales dashboard failing with 403 error (missing dashboard.sales permission)
    (useSalesDashboard as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { response: { status: 403, data: { message: 'Missing required permissions [dashboard.sales]' } } },
    });

    (useOperatorDashboard as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    (dossiersService.getDossiers as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'dos-101',
          code: 'DOS-2026-001',
          name: 'Tour Hà Giang 3N2Đ',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OperationalDashboard />
      </QueryClientProvider>,
    );

    // 1. Verify global crashing alert is NOT present
    expect(screen.queryByText('Không thể tải Dashboard')).toBeNull();
    expect(screen.queryByText('Vui lòng kiểm tra lại kết nối hoặc tải lại trang.')).toBeNull();

    // 2. Verify localized gentle notice is rendered for sales revenue card
    expect(await screen.findByText('Chưa có quyền xem thống kê này')).toBeInTheDocument();
    expect(screen.getByText('Yêu cầu quyền dashboard.sales')).toBeInTheDocument();

    // 3. Verify dossiers list and other widgets remain fully functional
    expect(await screen.findByText('DOS-2026-001')).toBeInTheDocument();
    expect(screen.getAllByText(/\+ Tạo Tour mới từ Excel|Import dự toán Excel/).length).toBeGreaterThan(0);
  });

  it('renders inline table alert when dossier listing fails without crashing the whole dashboard', async () => {
    useAuthStore.setState({
      user: {
        id: 'sales-1',
        email: 'sales@skylux.vn',
        fullName: 'Nguyễn Văn Sales',
        organizationId: 'org-1',
      } as any,
      hasRole: (role: string | string[]) => {
        if (Array.isArray(role)) return role.includes('SALES');
        return role === 'SALES';
      },
    });

    (useSalesDashboard as jest.Mock).mockReturnValue({
      data: { revenue: 50000000 },
      isLoading: false,
      isError: false,
    });

    (useOperatorDashboard as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    (dossiersService.getDossiers as jest.Mock).mockRejectedValue(new Error('Dossier list 403'));

    render(
      <QueryClientProvider client={queryClient}>
        <OperationalDashboard />
      </QueryClientProvider>,
    );

    // Global crash alert must NOT be displayed
    expect(screen.queryByText('Không thể tải Dashboard')).toBeNull();

    // Localized alert inside table card is displayed
    expect(await screen.findByText('Không thể tải danh sách hồ sơ')).toBeInTheDocument();

    // Revenue KPI card still displays normal figures
    expect(await screen.findByText('50 Tr')).toBeInTheDocument();
    expect(screen.getAllByText(/\+ Tạo Tour mới từ Excel|Import dự toán Excel/).length).toBeGreaterThan(0);
  });

  it('renders inline notice when operator stats return 403 error without crashing', async () => {
    useAuthStore.setState({
      user: {
        id: 'op-1',
        email: 'operator@skylux.vn',
        fullName: 'Trần Điều Hành',
        organizationId: 'org-1',
      } as any,
      hasRole: (role: string | string[]) => {
        if (Array.isArray(role)) return role.includes('OPERATOR');
        return role === 'OPERATOR';
      },
    });

    (useSalesDashboard as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    (useOperatorDashboard as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { response: { status: 403 } },
    });

    (dossiersService.getDossiers as jest.Mock).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OperationalDashboard />
      </QueryClientProvider>,
    );

    // Global crash alert must NOT be displayed
    expect(screen.queryByText('Không thể tải Dashboard')).toBeNull();

    // Localized operator fallback notice
    expect(await screen.findByText('Chưa có quyền xem thống kê này')).toBeInTheDocument();
    expect(screen.getByText('Yêu cầu quyền dashboard.operator')).toBeInTheDocument();
  });
});
