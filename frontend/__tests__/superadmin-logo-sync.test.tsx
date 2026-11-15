import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { SuperAdminWorkspace } from '@/components/super-admin/SuperAdminWorkspace';
import { MainSidebar } from '@/components/layout/MainSidebar';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

describe('SuperAdmin & Role Sidebar BrandLogo Synchronization and Sizing', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    useUIStore.setState({
      sidebarCollapsed: false,
      notificationsDrawerOpen: false,
    });

    useAuthStore.setState({
      user: {
        id: 'sa-1',
        fullName: 'Super Administrator',
        email: 'superadmin@skylux.vn',
        organizationId: 'org-root',
        employeeCode: 'SA001',
        roles: ['SUPER_ADMIN'],
        permissions: ['*'],
      },
      isAuthenticated: true,
      hasHydrated: true,
    });
  });

  describe('1. SuperAdminWorkspace BrandLogo Synchronization', () => {
    it('renders BrandLogo in full size xl linking to /dashboard when expanded', () => {
      render(
        <App>
          <QueryClientProvider client={queryClient}>
            <SuperAdminWorkspace
              routeMeta={{ title: 'Tổng quan', subtitle: 'Theo dõi hệ thống' }}
              userCtx={{
                roles: ['SUPER_ADMIN'],
                permissions: ['*'],
                isSuperAdmin: true,
              }}
            >
              <div>Dashboard Content</div>
            </SuperAdminWorkspace>
          </QueryClientProvider>
        </App>,
      );

      // Verify BrandLogo link to /dashboard
      const logoLink = screen.getByRole('link', {
        name: /OPTRIP - Nền tảng quản trị và điều hành tour lữ hành/i,
      });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/dashboard');

      // Verify official dark theme full logo image with size xl (180x60)
      const logoImg = screen.getByAltText('OPTRIP - Travel Operations Platform');
      expect(logoImg).toBeInTheDocument();
      expect(logoImg.getAttribute('src')).toContain('/brand/optrip-logo-dark.png');
      expect(logoImg).toHaveAttribute('width', '180');
      expect(logoImg).toHaveAttribute('height', '60');
    });

    it('switches to mark variant size md when sidebar is collapsed', () => {
      render(
        <App>
          <QueryClientProvider client={queryClient}>
            <SuperAdminWorkspace
              routeMeta={{ title: 'Tổng quan', subtitle: 'Theo dõi hệ thống' }}
              userCtx={{
                roles: ['SUPER_ADMIN'],
                permissions: ['*'],
                isSuperAdmin: true,
              }}
            >
              <div>Dashboard Content</div>
            </SuperAdminWorkspace>
          </QueryClientProvider>
        </App>,
      );

      // Find and click "Thu gọn" button in SuperAdmin sidebar wrapped in act
      const collapseBtn = screen.getByRole('button', { name: /Thu gọn/i });
      act(() => {
        fireEvent.click(collapseBtn);
      });

      // Verify mark image with 1:1 ratio and size md (38x38)
      const markImg = screen.getByAltText('OPTRIP App Icon');
      expect(markImg).toBeInTheDocument();
      expect(markImg.getAttribute('src')).toContain('/brand/optrip-mark.png');
      expect(markImg).toHaveAttribute('width', '38');
      expect(markImg).toHaveAttribute('height', '38');
    });
  });

  describe('2. MainSidebar Role Logo Sizing & Alignment', () => {
    it('renders BrandLogo in full size xl for other roles (CEO, Sales, Operator) when expanded', () => {
      useUIStore.setState({ sidebarCollapsed: false });

      render(
        <MainSidebar
          userCtx={{
            roles: ['SALES'],
            permissions: ['dossier.view.own'],
            isSales: true,
            isOperator: false,
            isCeoAdmin: false,
          }}
        />,
      );

      const logoLink = screen.getByRole('link', {
        name: /OPTRIP - Nền tảng quản trị và điều hành tour lữ hành/i,
      });
      expect(logoLink).toHaveAttribute('href', '/dashboard');

      const logoImg = screen.getByAltText('OPTRIP - Travel Operations Platform');
      expect(logoImg).toBeInTheDocument();
      expect(logoImg.getAttribute('src')).toContain('/brand/optrip-logo-dark.png');
      expect(logoImg).toHaveAttribute('width', '180');
      expect(logoImg).toHaveAttribute('height', '60');
    });

    it('renders BrandLogo in mark variant size md for other roles when collapsed', () => {
      render(
        <MainSidebar
          userCtx={{
            roles: ['CEO_ADMIN'],
            permissions: ['*'],
            isSales: false,
            isOperator: false,
            isCeoAdmin: true,
          }}
        />,
      );

      act(() => {
        useUIStore.getState().setSidebarCollapsed(true);
      });

      const markImg = screen.getByAltText('OPTRIP App Icon');
      expect(markImg).toBeInTheDocument();
      expect(markImg.getAttribute('src')).toContain('/brand/optrip-mark.png');
      expect(markImg).toHaveAttribute('width', '38');
      expect(markImg).toHaveAttribute('height', '38');
    });
  });
});
