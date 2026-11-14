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
  DeleteOutlined: () => null,
  FileExcelOutlined: () => null,
  FolderOpenOutlined: () => null,
  ReloadOutlined: () => null,
  SearchOutlined: () => null,
  WarningOutlined: () => null,
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

// Mock window.getComputedStyle before importing AntD / DossiersPage
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
    deleteDossier: jest.fn(),
  },
}));

describe('Ticket 02: Dossiers Table Action Group & Deletion', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockDraftDossier = {
    id: 'dossier-draft-1',
    code: 'HS-DRAFT-001',
    name: 'Tour Nha Trang',
    status: 'DRAFT',
    priority: 'HIGH',
    salesUserId: 'user-sales-1',
    salesUser: { id: 'user-sales-1', fullName: 'Nguyen Sales' },
    customerName: 'Cong ty ABC',
    updatedAt: '2026-11-15T00:00:00.000Z',
  };

  const mockApprovedDossier = {
    id: 'dossier-approved-2',
    code: 'HS-APPROVED-002',
    name: 'Tour Da Nang',
    status: 'APPROVED',
    priority: 'MEDIUM',
    salesUserId: 'user-sales-1',
    salesUser: { id: 'user-sales-1', fullName: 'Nguyen Sales' },
    customerName: 'Cong ty XYZ',
    updatedAt: '2026-11-15T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (dossiersService.getDossiers as jest.Mock).mockResolvedValue({
      data: [mockDraftDossier, mockApprovedDossier],
      meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DossiersPage />
      </QueryClientProvider>,
    );
  };

  it('renders Action Group with View and Delete buttons for dossiers', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-sales-1',
        fullName: 'Nguyen Sales',
        email: 'sales@example.com',
        roles: ['SALES'],
        permissions: ['dossier.view.all', 'dossier.delete'],
      } as any,
      isAuthenticated: true,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HS-DRAFT-001')).toBeInTheDocument();
    });

    // View detail buttons exist
    const viewButtons = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    expect(viewButtons.length).toBeGreaterThanOrEqual(2);

    // Draft dossier delete button should be enabled for owner
    const draftDeleteBtn = screen.getByRole('button', {
      name: 'Xóa hồ sơ HS-DRAFT-001',
    });
    expect(draftDeleteBtn).toBeInTheDocument();
    expect(draftDeleteBtn).not.toBeDisabled();

    // Approved dossier delete button should be disabled for regular SALES
    const approvedDeleteBtn = screen.getByRole('button', {
      name: 'Xóa hồ sơ HS-APPROVED-002 (vô hiệu)',
    });
    expect(approvedDeleteBtn).toBeInTheDocument();
    expect(approvedDeleteBtn).toBeDisabled();
  });

  it('allows owner to click delete on draft dossier and confirms Popconfirm', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-sales-1',
        fullName: 'Nguyen Sales',
        email: 'sales@example.com',
        roles: ['SALES'],
        permissions: ['dossier.view.all', 'dossier.delete'],
      } as any,
      isAuthenticated: true,
    });

    (dossiersService.deleteDossier as jest.Mock).mockResolvedValueOnce(undefined);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HS-DRAFT-001')).toBeInTheDocument();
    });

    const draftDeleteBtn = screen.getByRole('button', {
      name: 'Xóa hồ sơ HS-DRAFT-001',
    });
    fireEvent.click(draftDeleteBtn);

    // Popconfirm modal/popover appears
    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa hồ sơ')).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn có chắc chắn muốn xóa hồ sơ này\? Dự toán kèm theo sẽ bị xóa tạm thời\./i),
      ).toBeInTheDocument();
    });

    // Click confirm button in popconfirm
    const confirmBtn = screen.getByRole('button', { name: 'Xóa hồ sơ' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(dossiersService.deleteDossier).toHaveBeenCalledWith(
        'dossier-draft-1',
        'Xóa từ danh sách hồ sơ',
      );
    });
  });

  it('allows CEO_ADMIN to delete approved dossier', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-ceo-1',
        fullName: 'CEO Admin',
        email: 'ceo@example.com',
        roles: ['CEO_ADMIN'],
        permissions: ['*'],
      } as any,
      isAuthenticated: true,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HS-APPROVED-002')).toBeInTheDocument();
    });

    // For CEO_ADMIN, delete button for approved dossier is enabled
    const approvedDeleteBtn = screen.getByRole('button', {
      name: 'Xóa hồ sơ HS-APPROVED-002',
    });
    expect(approvedDeleteBtn).toBeInTheDocument();
    expect(approvedDeleteBtn).not.toBeDisabled();
  });
});
