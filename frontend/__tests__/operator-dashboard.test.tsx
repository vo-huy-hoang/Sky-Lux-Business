import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OperatorDashboard from '@/components/operator/OperatorDashboard';

// Mock dependencies
jest.mock('@/hooks/dashboards', () => ({
  useOperatorDashboard: jest.fn(() => ({
    data: {
      totalProfit: 50000000,
      totalDossiersCount: 7,
      pendingApprovalsCount: 2,
      activeDossiersCount: 3,
      overdueTasksCount: 1,
      totalSuppliers: 14,
      priorityBreakdown: [
        { priority: 'HIGH', count: 2 },
        { priority: 'MEDIUM', count: 3 },
      ],
      revenueBreakdown: [
        { marketTypeName: 'Outbound', amount: 100000000 },
      ],
      businessLineBreakdown: [
        { businessLineName: 'Du lịch trọn gói', amount: 100000000 },
      ],
      supplierBreakdown: [
        { supplierId: 's1', supplierCode: 'SUP-01', supplierName: 'Khách sạn Mường Thanh', amount: 30000000, dossierCount: 2 },
      ],
    },
    isLoading: false,
  })),
  useOperatorMonthlyTrend: jest.fn(() => ({
    data: [
      { month: '2026-10', totalRevenue: 150000000 },
    ],
    isLoading: false,
  })),
  useOperatorSalesSummary: jest.fn(() => ({
    data: [
      { salesUserId: 'u1', salesUserName: 'Nguyễn Thu Hà', totalDossiers: 4, totalRevenue: 821500000, approvedDossiers: 3, completionRate: 75 },
    ],
    isLoading: false,
  })),
}));

jest.mock('@/hooks/dossiers', () => ({
  useDossiersList: jest.fn(() => ({
    data: {
      data: [
        {
          id: 'dos-1',
          code: 'DOS-2026-001',
          salesUser: { fullName: 'Nguyễn Thu Hà' },
          customer: { displayName: 'Vingroup' },
          startDate: '2026-10-20',
          status: 'IN_REVIEW',
        },
      ],
    },
    isLoading: false,
  })),
}));

jest.mock('@/services/tasks.service', () => ({
  tasksService: {
    getTasks: jest.fn().mockResolvedValue({
      data: [
        { id: 't-1', title: 'Kiểm tra phòng khách sạn', priority: 'HIGH', dueAt: '2026-10-15' },
      ],
    }),
  },
}));

describe('OperatorDashboard Component (Phase 1 & Phase 2 Improvements)', () => {
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

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
      if (pseudoElt) {
        return {
          width: '0px',
          height: '0px',
          getPropertyValue: () => '',
        } as any;
      }
      return originalGetComputedStyle.call(this, elt);
    };
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OperatorDashboard />
      </QueryClientProvider>
    );
  };

  it('renders all 5 operational KPI cards with clickable drill-down links', () => {
    renderDashboard();

    // 1. Thẻ Hồ sơ toàn hệ thống -> /main/dossiers
    const dossiersLinks = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === '/main/dossiers');
    expect(dossiersLinks.length).toBeGreaterThanOrEqual(1);

    // 2. Thẻ Hồ sơ chờ duyệt -> /main/dossiers?status=SUBMITTED
    const submittedLinks = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === '/main/dossiers?status=SUBMITTED');
    expect(submittedLinks.length).toBe(1);

    // 3. Thẻ Hồ sơ đang xử lý -> /main/dossiers?status=IN_REVIEW
    const inReviewLinks = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === '/main/dossiers?status=IN_REVIEW');
    expect(inReviewLinks.length).toBe(1);

    // 4. Thẻ Ưu tiên cao / Khẩn cấp -> /main/dossiers?priority=HIGH
    const highPriorityLinks = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === '/main/dossiers?priority=HIGH');
    expect(highPriorityLinks.length).toBeGreaterThanOrEqual(1);

    // 5. Thẻ Nhà cung cấp đối tác -> /main/suppliers
    const suppliersLinks = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === '/main/suppliers');
    expect(suppliersLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders actionable reminder links in the "Nhắc nhở vận hành" card', () => {
    renderDashboard();

    // Nhắc nhở quá hạn công việc -> /main/tasks
    const taskReminder = screen.getByText('Quá hạn công việc').closest('a');
    expect(taskReminder).toHaveAttribute('href', '/main/tasks');

    // Nhắc nhở ưu tiên xử lý -> /main/dossiers?priority=HIGH
    const priorityReminder = screen.getByText('Ưu tiên xử lý').closest('a');
    expect(priorityReminder).toHaveAttribute('href', '/main/dossiers?priority=HIGH');

    // Nhắc nhở mạng lưới đối tác -> /main/suppliers
    const supplierReminder = screen.getByText('Mạng lưới đối tác').closest('a');
    expect(supplierReminder).toHaveAttribute('href', '/main/suppliers');
  });

  it('contains exactly 6 semantic <h2> headings across all widget cards', () => {
    renderDashboard();

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.length).toBe(6);

    const headingTexts = headings.map((h) => h.textContent?.trim());
    expect(headingTexts).toContain('Top Sales theo Hiệu suất');
    expect(headingTexts).toContain('Cơ cấu doanh thu theo loại hình');
    expect(headingTexts).toContain('Việc cần xử lý hôm nay');
    expect(headingTexts).toContain('Nhắc nhở vận hành');
    expect(headingTexts).toContain('Hồ sơ gần đây');
    expect(headingTexts).toContain('Doanh thu Nhà cung cấp');
  });

  it('has accessibility landmark regions with aria-labels', () => {
    renderDashboard();

    expect(screen.getByLabelText('Chỉ số vận hành điều hành')).toBeInTheDocument();
    expect(screen.getByLabelText('Báo cáo tiến độ và công việc')).toBeInTheDocument();
    expect(screen.getByLabelText('Hồ sơ và mạng lưới nhà cung cấp')).toBeInTheDocument();
  });
});
