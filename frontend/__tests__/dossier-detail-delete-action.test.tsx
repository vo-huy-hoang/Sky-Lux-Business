import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DossierHeader } from '@/components/dossiers/detail/components/DossierHeader';
import { useAuthStore } from '@/lib/stores/auth-store';
import { dossiersService } from '@/services/dossiers.service';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dossiers/dossier-test-id',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'dossier-test-id' }),
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    deleteDossier: jest.fn(),
  },
}));

// Mock ResizeObserver for Ant Design modal in jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeAll(() => {
  window.ResizeObserver = MockResizeObserver;
  global.ResizeObserver = MockResizeObserver;
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
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQuery = (ui: React.ReactElement) => {
  const testClient = createTestQueryClient();
  return render(<QueryClientProvider client={testClient}>{ui}</QueryClientProvider>);
};

describe('Ticket 03: Dossier Header Delete Action & Danger Modal Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Khóa nút Xóa kèm Tooltip khi hồ sơ đã có thanh toán thực tế (hasPayments = true)', () => {
    useAuthStore.setState({
      user: {
        id: 'ceo-user-id',
        email: 'ceo@optrip.vn',
        fullName: 'Nguyễn Viết Trãi',
        roles: ['CEO_ADMIN'],
        permissions: ['dossier.delete', 'dossier.view'],
      } as any,
    });

    const mockDossier = {
      id: 'dossier-123',
      code: '380604-TOUR-CONG-TY-ABC',
      status: 'APPROVED',
      salesUserId: 'sales-1',
    };

    renderWithQuery(
      <DossierHeader dossier={mockDossier} isCeoAdmin={true} hasPayments={true} />
    );

    const deleteBtn = screen.getByRole('button', {
      name: /Xóa hồ sơ 380604-TOUR-CONG-TY-ABC \(vô hiệu\)/i,
    });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveClass('opacity-50');
  });

  it('2. Khóa nút Xóa khi người dùng không có quyền dossier.delete', () => {
    useAuthStore.setState({
      user: {
        id: 'viewer-id',
        email: 'viewer@optrip.vn',
        fullName: 'Nhân viên xem',
        roles: ['SALES'],
        permissions: ['dossier.view'],
      } as any,
    });

    const mockDossier = {
      id: 'dossier-123',
      code: '380604-TOUR-CONG-TY-ABC',
      status: 'DRAFT',
      salesUserId: 'viewer-id',
    };

    renderWithQuery(<DossierHeader dossier={mockDossier} hasPayments={false} />);

    const deleteBtn = screen.getByRole('button', {
      name: /Xóa hồ sơ 380604-TOUR-CONG-TY-ABC \(vô hiệu\)/i,
    });
    expect(deleteBtn).toBeDisabled();
  });

  it('3. Hồ sơ APPROVED mở Danger Modal, yêu cầu gõ lại mã hồ sơ & lý do, xóa thành công điều hướng về /dossiers', async () => {
    useAuthStore.setState({
      user: {
        id: 'ceo-user-id',
        email: 'ceo@optrip.vn',
        fullName: 'Nguyễn Viết Trãi',
        roles: ['CEO_ADMIN'],
        permissions: ['dossier.delete', 'dossier.view'],
      } as any,
    });

    const mockDossier = {
      id: 'dossier-approved-1',
      code: '380604-TOUR-CONG-TY-ABC',
      status: 'APPROVED',
      salesUserId: 'sales-1',
    };

    (dossiersService.deleteDossier as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { id: 'dossier-approved-1', isDeleted: true },
    });

    renderWithQuery(
      <DossierHeader dossier={mockDossier} isCeoAdmin={true} hasPayments={false} />
    );

    // Nút Xóa hồ sơ khả dụng
    const deleteBtn = screen.getByRole('button', {
      name: /Xóa hồ sơ 380604-TOUR-CONG-TY-ABC/i,
    });
    expect(deleteBtn).toBeEnabled();

    // Click mở Danger Modal
    fireEvent.click(deleteBtn);

    // Kiểm tra Modal xuất hiện
    expect(screen.getByText('Xác nhận xóa hồ sơ nguy cơ cao')).toBeInTheDocument();
    expect(
      screen.getByText(/Đây là hồ sơ đã được duyệt hoặc hoàn tất/i)
    ).toBeInTheDocument();

    const confirmSubmitBtn = screen.getByRole('button', {
      name: /Xác nhận xóa vĩnh viễn/i,
    });
    // Ban đầu nút submit bị disable
    expect(confirmSubmitBtn).toBeDisabled();

    // Nhập sai mã hồ sơ -> Vẫn disabled
    const codeInput = screen.getByLabelText(/Nhập lại mã hồ sơ để xác nhận/i);
    fireEvent.change(codeInput, { target: { value: 'SAI-MA-HO-SO' } });
    expect(confirmSubmitBtn).toBeDisabled();

    // Nhập đúng mã hồ sơ nhưng chưa có lý do -> Vẫn disabled
    fireEvent.change(codeInput, { target: { value: '380604-TOUR-CONG-TY-ABC' } });
    expect(confirmSubmitBtn).toBeDisabled();

    // Nhập lý do xóa -> Nút submit được mở khóa
    const reasonInput = screen.getByLabelText(/Lý do xóa hồ sơ/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Khách hàng hủy hợp đồng trước khi phát sinh tiền thực tế' },
    });
    expect(confirmSubmitBtn).toBeEnabled();

    // Click xác nhận xóa
    fireEvent.click(confirmSubmitBtn);

    // Chờ gọi API và điều hướng về /dossiers
    await waitFor(() => {
      expect(dossiersService.deleteDossier).toHaveBeenCalledWith(
        'dossier-approved-1',
        'Khách hàng hủy hợp đồng trước khi phát sinh tiền thực tế'
      );
      expect(mockPush).toHaveBeenCalledWith('/dossiers');
    });
  });

  it('4. Hồ sơ DRAFT hiển thị Popconfirm, xác nhận xóa thành công điều hướng về /dossiers', async () => {
    useAuthStore.setState({
      user: {
        id: 'sales-owner-id',
        email: 'sales@optrip.vn',
        fullName: 'Lê Văn Sales',
        roles: ['SALES'],
        permissions: ['dossier.delete', 'dossier.view'],
      } as any,
    });

    const mockDossier = {
      id: 'dossier-draft-1',
      code: 'DRAFT-2026-001',
      status: 'DRAFT',
      salesUserId: 'sales-owner-id',
    };

    (dossiersService.deleteDossier as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { id: 'dossier-draft-1', isDeleted: true },
    });

    renderWithQuery(<DossierHeader dossier={mockDossier} hasPayments={false} />);

    const deleteBtn = screen.getByRole('button', {
      name: /Xóa hồ sơ DRAFT-2026-001/i,
    });
    expect(deleteBtn).toBeEnabled();

    fireEvent.click(deleteBtn);

    // Popconfirm opens
    expect(screen.getByText('Xác nhận xóa hồ sơ')).toBeInTheDocument();
    const okBtn = screen.getByRole('button', { name: 'Xóa hồ sơ' });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(dossiersService.deleteDossier).toHaveBeenCalledWith(
        'dossier-draft-1',
        undefined
      );
      expect(mockPush).toHaveBeenCalledWith('/dossiers');
    });
  });
});
