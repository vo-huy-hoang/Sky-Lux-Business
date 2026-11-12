import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRbacStore } from '@/app/(main)/users/store';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    getMe: jest.fn(),
    updateProfile: jest.fn(),
    updateSettings: jest.fn(),
    changePassword: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/services/users.service', () => ({
  usersService: {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    createCeo: jest.fn(),
    updateCeo: jest.fn(),
  },
}));

jest.mock('@/services/kpi.service', () => ({
  kpiService: {
    getMyKpi: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossiers: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

jest.mock('@/services/organizations.service', () => ({
  organizationsService: {
    listOrganizations: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/hooks/use-users', () => ({
  useUserRoles: () => ({
    data: [{ id: 'role-sales', code: 'SALES', name: 'Sales' }],
  }),
}));

jest.mock('@/hooks/useNotificationsRealtime', () => ({
  useNotificationsRealtime: jest.fn(),
  useNotificationsQuery: () => ({ data: undefined }),
  useUnreadNotificationsCountQuery: () => ({ data: undefined }),
}));

jest.mock('@/components/layout/MainSidebar', () => ({
  MainSidebar: () => <div data-testid="main-sidebar">Sidebar</div>,
}));

jest.mock('@/components/layout/MainHeader', () => ({
  MainHeader: () => <div data-testid="main-header">Header</div>,
}));

jest.mock('@/components/layout/NotificationDrawer', () => ({
  NotificationDrawer: () => null,
}));

jest.mock('@/components/common/RealtimeConnectionIndicator', () => ({
  RealtimeConnectionIndicator: () => null,
}));

jest.mock('@/components/super-admin/SuperAdminWorkspace', () => ({
  SuperAdminWorkspace: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-workspace">{children}</div>
  ),
}));

import ProfilePage from '../app/(main)/profile/page';
import UserModal from '../app/(main)/users/components/UserModal';
import MainLayout from '../app/(main)/layout';

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

  if (typeof global.MessageChannel === 'undefined') {
    class MockMessageChannel {
      port1: any;
      port2: any;
      constructor() {
        this.port1 = {
          onmessage: null as any,
          postMessage: (data: any) => {
            queueMicrotask(() => {
              this.port2.onmessage?.({ data });
            });
          },
          close: () => {},
        };
        this.port2 = {
          onmessage: null as any,
          postMessage: (data: any) => {
            queueMicrotask(() => {
              this.port1.onmessage?.({ data });
            });
          },
          close: () => {},
        };
      }
    }
    (global as any).MessageChannel = MockMessageChannel;
  }

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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>{ui}</AntdApp>
    </QueryClientProvider>,
  );
}

describe('Ticket 05: 2FA Switch Removal, Strong Password Policy & Forced First-Login Rotation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      hasHydrated: true,
      isAuthenticated: true,
      user: {
        id: 'u-1',
        organizationId: 'org-1',
        employeeCode: 'EMP001',
        fullName: 'Nguyen Van A',
        email: 'a@skylux.vn',
        roles: ['SALES'],
        permissions: ['dossier.view.own'],
        mustChangePassword: false,
      },
    });
    useRbacStore.setState({
      isUserModalOpen: false,
      editingUser: null,
    });
  });

  describe('ProfilePage', () => {
    it('does not render an active/toggleable 2FA switch and validates strong newPassword rules', async () => {
      (authService.getMe as jest.Mock).mockResolvedValue({
        id: 'u-1',
        organizationId: 'org-1',
        employeeCode: 'EMP001',
        fullName: 'Nguyen Van A',
        email: 'a@skylux.vn',
        twoFactorEnabled: false,
        mustChangePassword: false,
        notificationPreferences: {
          taskAssignments: false,
          dossierUpdates: false,
          appointmentReminders: false,
          periodicReports: false,
        },
        status: 'ACTIVE',
        roles: [{ id: 'r1', code: 'SALES', name: 'Sales' }],
        permissions: ['dossier.view.own'],
      });

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Cài đặt tài khoản')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('switch', { name: /bảo mật 2 lớp/i }),
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu hiện tại'), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu mới'), {
        target: { value: 'weakpass' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), {
        target: { value: 'weakpass' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /cập nhật mật khẩu$/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số/i),
        ).toBeInTheDocument();
      });
      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('re-authenticates browser session after successful password change on ProfilePage', async () => {
      (authService.getMe as jest.Mock).mockResolvedValue({
        id: 'u-1',
        organizationId: 'org-1',
        employeeCode: 'EMP001',
        fullName: 'Nguyen Van A',
        email: 'a@skylux.vn',
        twoFactorEnabled: false,
        mustChangePassword: false,
        notificationPreferences: {
          taskAssignments: false,
          dossierUpdates: false,
          appointmentReminders: false,
          periodicReports: false,
        },
        status: 'ACTIVE',
        roles: [{ id: 'r1', code: 'SALES', name: 'Sales' }],
        permissions: ['dossier.view.own'],
      });
      (authService.changePassword as jest.Mock).mockResolvedValue(null);
      (authService.login as jest.Mock).mockResolvedValue({
        user: {
          id: 'u-1',
          organizationId: 'org-1',
          employeeCode: 'EMP001',
          fullName: 'Nguyen Van A',
          email: 'a@skylux.vn',
          roles: ['SALES'],
          permissions: ['dossier.view.own'],
          mustChangePassword: false,
        },
      });

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Thông tin đăng nhập')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu hiện tại'), {
        target: { value: 'OldPass123' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu mới'), {
        target: { value: 'NewStrongPass1' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), {
        target: { value: 'NewStrongPass1' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /cập nhật mật khẩu$/i }),
      );

      await waitFor(() => {
        expect(authService.changePassword).toHaveBeenCalledWith({
          currentPassword: 'OldPass123',
          newPassword: 'NewStrongPass1',
        });
      });

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'a@skylux.vn',
          password: 'NewStrongPass1',
        });
      });
    });
  });

  describe('UserModal', () => {
    it('does not mention hardcoded SkyLux@123 default and displays generated temporaryPassword once after creation', async () => {
      useAuthStore.setState({
        hasHydrated: true,
        isAuthenticated: true,
        user: {
          id: 'ceo-1',
          organizationId: 'org-1',
          employeeCode: 'CEO001',
          fullName: 'CEO Admin',
          email: 'ceo@skylux.vn',
          roles: ['CEO_ADMIN'],
          permissions: ['*'],
          mustChangePassword: false,
        },
      });
      useRbacStore.setState({
        isUserModalOpen: true,
        editingUser: null,
      });

      (usersService.createUser as jest.Mock).mockResolvedValue({
        id: 'new-u-1',
        organizationId: 'org-1',
        employeeCode: 'EMP099',
        fullName: 'Nhan Vien Moi',
        email: 'nv@skylux.vn',
        status: 'ACTIVE',
        mustChangePassword: true,
        temporaryPassword: 'TempRandom9#xQ',
        createdAt: '2026-11-13T00:00:00Z',
      });

      renderWithProviders(<UserModal />);

      expect(screen.queryByPlaceholderText(/SkyLux@123/i)).not.toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('VD: Nguyễn Văn A'), {
        target: { value: 'Nhan Vien Moi' },
      });
      fireEvent.change(screen.getByPlaceholderText('VD: anbv@skylux.vn'), {
        target: { value: 'nv@skylux.vn' },
      });

      fireEvent.click(screen.getByRole('button', { name: /tạo mới/i }));

      await waitFor(() => {
        expect(usersService.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: 'Nhan Vien Moi',
            email: 'nv@skylux.vn',
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('generated-temp-password')).toHaveTextContent(
          'TempRandom9#xQ',
        );
      });
    });

    it('rejects weak explicit password on UserModal submit', async () => {
      useAuthStore.setState({
        hasHydrated: true,
        isAuthenticated: true,
        user: {
          id: 'ceo-1',
          organizationId: 'org-1',
          employeeCode: 'CEO001',
          fullName: 'CEO Admin',
          email: 'ceo@skylux.vn',
          roles: ['CEO_ADMIN'],
          permissions: ['*'],
          mustChangePassword: false,
        },
      });
      useRbacStore.setState({
        isUserModalOpen: true,
        editingUser: null,
      });

      renderWithProviders(<UserModal />);

      fireEvent.change(screen.getByPlaceholderText('VD: Nguyễn Văn A'), {
        target: { value: 'Nhan Vien Yeu' },
      });
      fireEvent.change(screen.getByPlaceholderText('VD: anbv@skylux.vn'), {
        target: { value: 'weak@skylux.vn' },
      });
      fireEvent.change(
        screen.getByPlaceholderText('Để trống để hệ thống tự sinh mật khẩu tạm ngẫu nhiên'),
        { target: { value: '123456' } },
      );

      fireEvent.click(screen.getByRole('button', { name: /tạo mới/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số/i),
        ).toBeInTheDocument();
      });
      expect(usersService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('MainLayout forced first-login password rotation', () => {
    it('blocks normal workspace content and forces password change when user.mustChangePassword is true', async () => {
      useAuthStore.setState({
        hasHydrated: true,
        isAuthenticated: true,
        user: {
          id: 'u-temp',
          organizationId: 'org-1',
          employeeCode: 'EMP099',
          fullName: 'Temp Staff',
          email: 'nv@skylux.vn',
          roles: ['SALES'],
          permissions: ['dossier.view.own'],
          mustChangePassword: true,
        },
      });

      (authService.changePassword as jest.Mock).mockResolvedValue(null);
      (authService.login as jest.Mock).mockResolvedValue({
        user: {
          id: 'u-temp',
          organizationId: 'org-1',
          employeeCode: 'EMP099',
          fullName: 'Temp Staff',
          email: 'nv@skylux.vn',
          roles: ['SALES'],
          permissions: ['dossier.view.own'],
          mustChangePassword: false,
        },
      });

      renderWithProviders(
        <MainLayout>
          <div data-testid="workspace-child">Workspace Content</div>
        </MainLayout>,
      );

      await waitFor(() => {
        expect(screen.getByText(/đổi mật khẩu lần đầu/i)).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workspace-child')).not.toBeInTheDocument();
      expect(screen.queryByTestId('main-sidebar')).not.toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu tạm thời hiện tại'), {
        target: { value: 'TempRandom9#xQ' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu mới (tối thiểu 8 ký tự)'), {
        target: { value: 'MyStrongPass1' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), {
        target: { value: 'MyStrongPass1' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /đổi mật khẩu và tiếp tục/i }),
      );

      await waitFor(() => {
        expect(authService.changePassword).toHaveBeenCalledWith({
          currentPassword: 'TempRandom9#xQ',
          newPassword: 'MyStrongPass1',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('workspace-child')).toBeInTheDocument();
      });
    });

    it('switches immediately to ForceChangePasswordGate when skylux:password-change-required event fires', async () => {
      renderWithProviders(
        <MainLayout>
          <div data-testid="workspace-child">Workspace Content</div>
        </MainLayout>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-child')).toBeInTheDocument();
      });

      act(() => {
        window.dispatchEvent(new CustomEvent('skylux:password-change-required'));
      });

      await waitFor(() => {
        expect(screen.getByText(/đổi mật khẩu lần đầu/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('workspace-child')).not.toBeInTheDocument();
    });
  });
});
