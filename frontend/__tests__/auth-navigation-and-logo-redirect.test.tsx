import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import { MainSidebar } from '@/components/layout/MainSidebar';
import LoginPage from '@/app/login/page';
import ClientLandingPage from '@/app/(client)/page';
import { ClientHeader } from '@/components/client/ClientHeader';
import { authService } from '@/services/auth.service';

// Mock dependencies
jest.mock('@/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  fullName: 'Nguyễn Viết Trãi',
  email: 'trai@optrip.vn',
  organizationId: 'org-1',
  employeeCode: 'NV001',
  roles: ['CEO_ADMIN'],
  permissions: ['*'],
};
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => mockSearchParams,
}));

describe('Auth Navigation, History Guard & Logo Destination', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      hasHydrated: true,
      lockoutSeconds: 0,
    });
  });

  describe('1. MainSidebar BrandLogo Link Destination', () => {
    it('always points BrandLogo to /dashboard in the internal app sidebar', () => {
      render(
        <MainSidebar
          userCtx={{
            roles: ['CEO_ADMIN'],
            permissions: ['*'],
            isCeoAdmin: true,
            isSales: false,
            isOperator: false,
          }}
        />,
      );

      const links = screen.getAllByRole('link', {
        name: /OPTRIP/i,
      });
      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link).toHaveAttribute('href', '/dashboard');
      });
    });
  });

  describe('2. LoginPage Authentication Guard & History Replacement', () => {
    it('automatically redirects authenticated user to /dashboard via router.replace', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        hasHydrated: true,
      });

      render(
        <App>
          <QueryClientProvider client={queryClient}>
            <LoginPage />
          </QueryClientProvider>
        </App>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('replaces history with custom redirect path upon successful login', async () => {
      mockSearchParams = new URLSearchParams('redirect=/dossiers');

      (authService.login as jest.Mock).mockResolvedValueOnce({
        accessToken: 'mock-jwt-token',
        user: {
          id: 'user-1',
          fullName: 'Nguyễn Viết Trãi',
          email: 'trai@optrip.vn',
          roles: ['CEO_ADMIN'],
          permissions: ['*'],
        },
      });

      render(
        <App>
          <QueryClientProvider client={queryClient}>
            <LoginPage />
          </QueryClientProvider>
        </App>,
      );

      const emailInput = screen.getByPlaceholderText('name@company.com');
      const passwordInput = screen.getByPlaceholderText('Nhập mật khẩu truy cập');
      const submitBtn = screen.getByRole('button', { name: /Đăng nhập vào hệ thống/i });

      fireEvent.change(emailInput, { target: { value: 'trai@optrip.vn' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'trai@optrip.vn',
          password: 'Secret123!',
        });
        // Must use router.replace instead of router.push so /login is not left in history
        expect(mockReplace).toHaveBeenCalledWith('/dossiers');
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe('3. ClientLandingPage Redirection & Public Mode Escape Hatch', () => {
    it('redirects authenticated user to /dashboard by default', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        hasHydrated: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ClientLandingPage />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('does not redirect unauthenticated guest on landing page', async () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        hasHydrated: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ClientLandingPage />
        </QueryClientProvider>,
      );

      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('does not redirect authenticated user when ?public=true is present', async () => {
      mockSearchParams = new URLSearchParams('public=true');
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        hasHydrated: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ClientLandingPage />
        </QueryClientProvider>,
      );

      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });

  describe('4. ClientHeader Navigation Adaptation', () => {
    it('renders "Vào Bảng Điều Khiển" linking to /dashboard when user is authenticated', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        hasHydrated: true,
      });

      render(<ClientHeader />);

      const dashboardLinks = await screen.findAllByRole('link', {
        name: /Vào Bảng Điều Khiển/i,
      });
      expect(dashboardLinks.length).toBeGreaterThan(0);
      dashboardLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/dashboard');
      });
    });

    it('renders "Đăng Nhập" linking to /login when user is guest', async () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        hasHydrated: true,
      });

      render(<ClientHeader />);

      const loginLinks = await screen.findAllByRole('link', {
        name: /Đăng Nhập/i,
      });
      expect(loginLinks.length).toBeGreaterThan(0);
      loginLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/login');
      });
    });
  });
});
