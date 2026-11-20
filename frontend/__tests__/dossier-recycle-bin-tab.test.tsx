import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@rc-component/util/lib/getScrollBarSize', () => ({
  __esModule: true,
  default: () => 0,
  getTargetScrollBarSize: () => ({ width: 0, height: 0 }),
}));

jest.mock('@ant-design/icons', () => ({
  CheckCircleOutlined: () => null,
  ClockCircleOutlined: () => null,
  EyeOutlined: () => null,
  DeleteOutlined: () => <span data-testid="delete-icon" />,
  FileExcelOutlined: () => null,
  FolderOpenOutlined: () => null,
  ReloadOutlined: () => null,
  RollbackOutlined: () => <span data-testid="rollback-icon" />,
  SearchOutlined: () => null,
  WarningOutlined: () => null,
  ExclamationCircleOutlined: () => null,
}));

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

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import DossiersPage from '@/app/(main)/dossiers/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { dossiersService } from '@/services/dossiers.service';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossiers: jest.fn(),
    getArchivedDossiers: jest.fn(),
    restoreDossier: jest.fn(),
    purgeDossier: jest.fn(),
    deleteDossier: jest.fn(),
  },
}));

describe('Ticket 03: Dossier Recycle Bin Tab, Scoped Display & Restore/Purge Actions', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockActiveDossier = {
    id: 'dos-active-1',
    code: 'ACT-TOUR-001',
    name: 'Tour Hà Nội - SaPa Đang Chạy',
    status: 'APPROVED',
    salesUserId: 'user-sales-1',
    salesUser: { id: 'user-sales-1', fullName: 'Nguyen Sales' },
    customerName: 'Cong ty FPT',
    updatedAt: '2026-11-15T00:00:00.000Z',
  };

  const mockArchivedDossier = {
    id: 'dos-archived-1',
    code: 'ARC-TOUR-999',
    name: 'Tour Đã Bị Xóa Tạm',
    route: 'Hà Nội - Đà Nẵng',
    status: 'DRAFT',
    salesUserId: 'user-sales-1',
    salesUser: { id: 'user-sales-1', fullName: 'Nguyen Sales' },
    customerName: 'Cong ty Viettel',
    deletedAt: '2026-11-16T10:00:00.000Z',
    deletionReason: 'Khách hàng dời kế hoạch sang năm sau',
    deletedByUser: {
      id: 'user-admin-1',
      fullName: 'Tran CEO Admin',
      email: 'admin@skylux.vn',
    },
    updatedAt: '2026-11-16T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    (dossiersService.getDossiers as jest.Mock).mockResolvedValue({
      data: [mockActiveDossier],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    (dossiersService.getArchivedDossiers as jest.Mock).mockResolvedValue({
      data: [mockArchivedDossier],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DossiersPage />
      </QueryClientProvider>,
    );
  };

  it('renders tab switcher with Active and Archived counts', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-sales-1',
        email: 'sales@skylux.vn',
        roles: ['SALES'],
        permissions: ['dossier.read'],
      } as any,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Thùng rác / Đã lưu trữ')).toBeInTheDocument();
      expect(screen.getByText('ACT-TOUR-001')).toBeInTheDocument();
    });
  });

  it('switches to Archived tab and renders deleted dossier info with restore button', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-sales-1',
        email: 'sales@skylux.vn',
        roles: ['SALES'],
        permissions: ['dossier.read'],
      } as any,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Thùng rác / Đã lưu trữ')).toBeInTheDocument();
    });

    // Switch to Archived tab
    fireEvent.click(screen.getByText('Thùng rác / Đã lưu trữ'));

    await waitFor(() => {
      expect(screen.getByText('ARC-TOUR-999')).toBeInTheDocument();
      expect(screen.getByText('Tour Đã Bị Xóa Tạm')).toBeInTheDocument();
      expect(
        screen.getByText('Khách hàng dời kế hoạch sang năm sau'),
      ).toBeInTheDocument();
      expect(screen.getByText('Tran CEO Admin')).toBeInTheDocument();
    });

    // Sales can see Restore button
    const restoreBtn = screen.getByRole('button', { name: /Khôi phục/i });
    expect(restoreBtn).toBeInTheDocument();

    // Sales does NOT see Hard Purge button
    expect(screen.queryByTitle(/Xóa vĩnh viễn khỏi hệ thống/i)).toBeNull();
  });

  it('triggers restore API when user confirms Popconfirm', async () => {
    (dossiersService.restoreDossier as jest.Mock).mockResolvedValueOnce({
      ...mockArchivedDossier,
      deletedAt: null,
    });

    useAuthStore.setState({
      user: {
        id: 'user-sales-1',
        email: 'sales@skylux.vn',
        roles: ['SALES'],
        permissions: ['dossier.read'],
      } as any,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Thùng rác / Đã lưu trữ')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Thùng rác / Đã lưu trữ'));

    await waitFor(() => {
      expect(screen.getByText('ARC-TOUR-999')).toBeInTheDocument();
    });

    const restoreBtn = screen.getByRole('button', { name: /Khôi phục/i });
    fireEvent.click(restoreBtn);

    // Popconfirm shows up with confirm button
    await waitFor(() => {
      const confirmPopBtn = screen.getAllByRole('button', { name: /^Khôi phục$/i });
      expect(confirmPopBtn.length).toBeGreaterThan(0);
      fireEvent.click(confirmPopBtn[confirmPopBtn.length - 1]);
    });

    await waitFor(() => {
      expect(dossiersService.restoreDossier).toHaveBeenCalledWith('dos-archived-1');
    });
  });

  it('renders Hard Purge button for CEO_ADMIN and opens confirmation modal', async () => {
    (dossiersService.purgeDossier as jest.Mock).mockResolvedValueOnce(undefined);

    useAuthStore.setState({
      user: {
        id: 'user-ceo-1',
        email: 'ceo@skylux.vn',
        roles: ['CEO_ADMIN'],
        permissions: ['dossier.read', 'dossier.delete'],
      } as any,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Thùng rác / Đã lưu trữ')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Thùng rác / Đã lưu trữ'));

    await waitFor(() => {
      expect(screen.getByText('ARC-TOUR-999')).toBeInTheDocument();
    });

    // For CEO_ADMIN, purge button exists in action column
    const purgeBtn = screen.getByLabelText('purge-dossier-button');
    expect(purgeBtn).toBeInTheDocument();
    fireEvent.click(purgeBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa vĩnh viễn hồ sơ')).toBeInTheDocument();
    });

    const purgeInput = screen.getByPlaceholderText('Gõ đúng "ARC-TOUR-999"');
    fireEvent.change(purgeInput, { target: { value: 'ARC-TOUR-999' } });

    const confirmPurgeBtn = screen.getByRole('button', {
      name: /Xóa vĩnh viễn khỏi hệ thống/i,
    });
    expect(confirmPurgeBtn).not.toBeDisabled();

    fireEvent.click(confirmPurgeBtn);

    await waitFor(() => {
      expect(dossiersService.purgeDossier).toHaveBeenCalledWith('dos-archived-1');
    });
  });
});
