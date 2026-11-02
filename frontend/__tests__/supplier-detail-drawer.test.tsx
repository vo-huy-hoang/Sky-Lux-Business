import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupplierDetailDrawer } from '@/app/(main)/suppliers/components/SupplierDetailDrawer';
import { suppliersService } from '@/services/suppliers.service';
import { useAuthStore } from '@/lib/stores/auth-store';

jest.mock('next/link', () => {
  return ({ children, href, className, title }: any) => (
    <a href={href} className={className} title={title}>
      {children}
    </a>
  );
});

jest.mock('@/services/suppliers.service', () => ({
  suppliersService: {
    getSupplier: jest.fn(),
    getSupplierDossiers: jest.fn(),
  },
}));

describe('SupplierDetailDrawer (Ticket 04)', () => {
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

    useAuthStore.setState({
      user: {
        id: 'user-admin',
        name: 'Admin',
        email: 'admin@skylux.com',
        roles: ['SUPER_ADMIN'],
        permissions: ['*'],
      } as any,
      isAuthenticated: true,
      hasHydrated: true,
    });

    (suppliersService.getSupplier as jest.Mock).mockResolvedValue({
      id: 'sup-1',
      code: 'SUP-001',
      name: 'Khách sạn Mường Thanh',
      status: 'ACTIVE',
      totalAmount: 50000000,
      taxCode: '0101234567',
      phone: '0901234567',
      email: 'muongthanh@hotel.vn',
      address: 'Đà Nẵng',
    });

    (suppliersService.getSupplierDossiers as jest.Mock).mockResolvedValue({
      data: [
        {
          dossierId: 'dos-101',
          dossierCode: 'DOS-2026-101',
          dossierTitle: 'Tour Đà Nẵng 3N2Đ Đoàn VIP',
          departureDate: '2026-11-15',
          status: 'COMPLETED',
          operatorOrSalesName: 'Nguyễn Thu Hà',
          lineCount: 2,
          totalCost: 35000000,
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders supplier details and tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SupplierDetailDrawer
          visible={true}
          supplierId="sup-1"
          onClose={jest.fn()}
        />
      </QueryClientProvider>,
    );

    const names = await screen.findAllByText('Khách sạn Mường Thanh');
    expect(names.length).toBeGreaterThan(0);
    expect(screen.getByText('Thông tin chung')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử cung ứng tour')).toBeInTheDocument();
  });

  it('displays tour history list when clicking on tours tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SupplierDetailDrawer
          visible={true}
          supplierId="sup-1"
          onClose={jest.fn()}
        />
      </QueryClientProvider>,
    );

    const names = await screen.findAllByText('Khách sạn Mường Thanh');
    expect(names.length).toBeGreaterThan(0);

    const tourTab = screen.getByText('Lịch sử cung ứng tour');
    fireEvent.click(tourTab);

    expect(await screen.findByText('DOS-2026-101')).toBeInTheDocument();
    expect(screen.getByText('Tour Đà Nẵng 3N2Đ Đoàn VIP')).toBeInTheDocument();
    expect(screen.getByText(/35\.000\.000/)).toBeInTheDocument();

    // Verify deep link to tour cost tab
    const tourLink = screen.getByRole('link', { name: /DOS-2026-101/i });
    expect(tourLink).toHaveAttribute('href', '/dossiers/dos-101?tab=cost');

    // Verify default filter is COMPLETED_ONLY (completedOnly: true)
    expect(suppliersService.getSupplierDossiers).toHaveBeenCalledWith(
      'sup-1',
      expect.objectContaining({
        completedOnly: true,
      }),
      expect.anything(),
    );
  });

  it('hides tour history tab and disables query when user lacks permissions', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-guest',
        name: 'Guest',
        email: 'guest@skylux.com',
        roles: ['GUEST'],
        permissions: [],
      } as any,
      isAuthenticated: true,
      hasHydrated: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SupplierDetailDrawer
          visible={true}
          supplierId="sup-1"
          onClose={jest.fn()}
        />
      </QueryClientProvider>,
    );

    const names = await screen.findAllByText('Khách sạn Mường Thanh');
    expect(names.length).toBeGreaterThan(0);
    expect(screen.getByText('Thông tin chung')).toBeInTheDocument();
    expect(screen.queryByText('Lịch sử cung ứng tour')).not.toBeInTheDocument();
    expect(suppliersService.getSupplierDossiers).not.toHaveBeenCalled();
  });

  it('shows empty state when supplier has no tour history', async () => {
    (suppliersService.getSupplierDossiers as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SupplierDetailDrawer
          visible={true}
          supplierId="sup-1"
          onClose={jest.fn()}
        />
      </QueryClientProvider>,
    );

    const names = await screen.findAllByText('Khách sạn Mường Thanh');
    expect(names.length).toBeGreaterThan(0);

    const tourTab = screen.getByText('Lịch sử cung ứng tour');
    fireEvent.click(tourTab);

    expect(
      await screen.findByText('Chưa có tour nào trong danh sách'),
    ).toBeInTheDocument();
  });
});
