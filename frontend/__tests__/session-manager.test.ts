import {
  safeRedirectPath,
  normalizeProfile,
  restoreSession,
  teardownSession,
  registerQueryClient,
  USER_STORAGE_KEYS,
  StorageAdapter,
  CookieAdapter,
  NavigationAdapter,
} from '../lib/session-manager';
import { useAuthStore } from '../lib/stores/auth-store';
import { AuthMeResponse } from '../services/auth.service';

describe('Ticket 07: Frontend SessionManager, Safe Redirect & Unified Logout Teardown', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      hasHydrated: true,
      lockoutSeconds: 0,
    });
  });

  describe('safeRedirectPath (Open-Redirect Vulnerability Defense)', () => {
    it('allows valid relative in-app paths', () => {
      expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
      expect(safeRedirectPath('/dossiers?status=APPROVED')).toBe('/dossiers?status=APPROVED');
      expect(safeRedirectPath('/reports#overview')).toBe('/reports#overview');
      expect(safeRedirectPath('/settings/users/edit/123')).toBe('/settings/users/edit/123');
    });

    it('rejects protocol-relative URLs (//evil.com)', () => {
      expect(safeRedirectPath('//evil.com')).toBe('/dashboard');
      expect(safeRedirectPath('//evil.com/phishing')).toBe('/dashboard');
      expect(safeRedirectPath('///evil.com')).toBe('/dashboard');
      expect(safeRedirectPath('////attacker.com')).toBe('/dashboard');
    });

    it('rejects backslash and encoded protocol-relative URLs', () => {
      expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard');
      expect(safeRedirectPath('/%2fevil.com')).toBe('/dashboard');
      expect(safeRedirectPath('/%2Fevil.com')).toBe('/dashboard');
      expect(safeRedirectPath('/%5cevil.com')).toBe('/dashboard');
      expect(safeRedirectPath('/%5Cevil.com')).toBe('/dashboard');
    });

    it('rejects absolute URLs (https://, http://, ftp://)', () => {
      expect(safeRedirectPath('https://evil.com')).toBe('/dashboard');
      expect(safeRedirectPath('https://evil.com/login')).toBe('/dashboard');
      expect(safeRedirectPath('http://attacker.org')).toBe('/dashboard');
      expect(safeRedirectPath('ftp://files.attacker.org')).toBe('/dashboard');
    });

    it('rejects javascript, data, and vbscript schemes', () => {
      expect(safeRedirectPath('javascript:alert(document.cookie)')).toBe('/dashboard');
      expect(safeRedirectPath('javascript:void(0)')).toBe('/dashboard');
      expect(safeRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
      expect(safeRedirectPath('vbscript:msgbox(1)')).toBe('/dashboard');
    });

    it('rejects CRLF and control character injections', () => {
      expect(safeRedirectPath('/\r\nevil.com')).toBe('/dashboard');
      expect(safeRedirectPath('/\nevil.com')).toBe('/dashboard');
      expect(safeRedirectPath('/\tevil.com')).toBe('/dashboard');
    });

    it('falls back to custom default path when provided', () => {
      expect(safeRedirectPath(null, '/custom-fallback')).toBe('/custom-fallback');
      expect(safeRedirectPath(undefined, '/custom-fallback')).toBe('/custom-fallback');
      expect(safeRedirectPath('', '/custom-fallback')).toBe('/custom-fallback');
      expect(safeRedirectPath('   ', '/custom-fallback')).toBe('/custom-fallback');
      expect(safeRedirectPath('//evil.com', '/custom-fallback')).toBe('/custom-fallback');
    });
  });

  describe('normalizeProfile (Collapsed AuthMeResponse -> UserProfile)', () => {
    it('normalizes complete AuthMeResponse correctly', () => {
      const authMe: AuthMeResponse = {
        id: 'u-1',
        organizationId: 'org-1',
        organization: { name: 'Sky-Lux Travel' },
        departmentId: 'dept-1',
        department: { name: 'Operations' },
        employeeCode: 'SLX-001',
        fullName: 'Nguyen Van A',
        email: 'vana@skylux.vn',
        phone: '0901234567',
        avatarUrl: 'https://example.com/avatar.png',
        twoFactorEnabled: false,
        mustChangePassword: true,
        notificationPreferences: {
          taskAssignments: true,
          dossierUpdates: true,
          appointmentReminders: true,
          periodicReports: false,
        },
        status: 'ACTIVE',
        roles: [
          { id: 'r-1', code: 'SALES', name: 'Nhân viên kinh doanh' },
          { id: 'r-2', code: 'OPERATOR', name: 'Nhân viên điều hành' },
        ],
        permissions: ['dossier.view', 'dossier.create'],
      };

      const normalized = normalizeProfile(authMe);

      expect(normalized).toEqual({
        id: 'u-1',
        organizationId: 'org-1',
        organizationName: 'Sky-Lux Travel',
        departmentId: 'dept-1',
        departmentName: 'Operations',
        employeeCode: 'SLX-001',
        fullName: 'Nguyen Van A',
        email: 'vana@skylux.vn',
        phone: '0901234567',
        avatarUrl: 'https://example.com/avatar.png',
        roles: ['SALES', 'OPERATOR'],
        permissions: ['dossier.view', 'dossier.create'],
        mustChangePassword: true,
      });
    });

    it('handles missing optional relations and falsy mustChangePassword', () => {
      const authMe: AuthMeResponse = {
        id: 'u-2',
        organizationId: 'org-2',
        employeeCode: 'SLX-002',
        fullName: 'Super Admin',
        email: 'admin@skylux.vn',
        twoFactorEnabled: false,
        notificationPreferences: {
          taskAssignments: false,
          dossierUpdates: false,
          appointmentReminders: false,
          periodicReports: false,
        },
        status: 'ACTIVE',
        roles: [],
        permissions: ['*'],
      };

      const normalized = normalizeProfile(authMe);

      expect(normalized.organizationName).toBeUndefined();
      expect(normalized.departmentName).toBeUndefined();
      expect(normalized.roles).toEqual([]);
      expect(normalized.mustChangePassword).toBe(false);
    });
  });

  describe('restoreSession', () => {
    it('fetches profile, normalizes it, and commits it into useAuthStore', async () => {
      const mockAuthMe: AuthMeResponse = {
        id: 'user-restored',
        organizationId: 'org-100',
        organization: { name: 'Sky-Lux Global' },
        employeeCode: 'SLX-100',
        fullName: 'Restored User',
        email: 'restored@skylux.vn',
        twoFactorEnabled: false,
        mustChangePassword: false,
        notificationPreferences: {
          taskAssignments: true,
          dossierUpdates: true,
          appointmentReminders: true,
          periodicReports: true,
        },
        status: 'ACTIVE',
        roles: [{ id: 'r-ceo', code: 'CEO_ADMIN', name: 'Giám đốc' }],
        permissions: ['*'],
      };

      const mockAuthService = {
        getMe: jest.fn().mockResolvedValue(mockAuthMe),
      };

      const profile = await restoreSession({
        authServiceInstance: mockAuthService,
      });

      expect(mockAuthService.getMe).toHaveBeenCalled();
      expect(profile.id).toBe('user-restored');
      expect(profile.roles).toEqual(['CEO_ADMIN']);

      const storeState = useAuthStore.getState();
      expect(storeState.isAuthenticated).toBe(true);
      expect(storeState.hasHydrated).toBe(true);
      expect(storeState.user?.id).toBe('user-restored');
    });

    it('propagates errors when session restoration fails', async () => {
      const networkError = new Error('Network offline');
      const mockAuthService = {
        getMe: jest.fn().mockRejectedValue(networkError),
      };

      await expect(
        restoreSession({ authServiceInstance: mockAuthService }),
      ).rejects.toThrow('Network offline');

      // State is not corrupted
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('recovers cleanly on retry after an initial transient network error', async () => {
      const mockAuthMe: AuthMeResponse = {
        id: 'user-retry-success',
        organizationId: 'org-200',
        employeeCode: 'SLX-200',
        fullName: 'Retry Success User',
        email: 'retry@skylux.vn',
        twoFactorEnabled: false,
        notificationPreferences: {
          taskAssignments: false,
          dossierUpdates: false,
          appointmentReminders: false,
          periodicReports: false,
        },
        status: 'ACTIVE',
        roles: [{ id: 'r-op', code: 'OPERATOR', name: 'Điều hành' }],
        permissions: ['dossier.view'],
      };

      const mockAuthService = {
        getMe: jest
          .fn()
          .mockRejectedValueOnce(new Error('Transient connection reset'))
          .mockResolvedValueOnce(mockAuthMe),
      };

      // 1. First attempt fails due to transient network glitch
      await expect(
        restoreSession({ authServiceInstance: mockAuthService }),
      ).rejects.toThrow('Transient connection reset');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // 2. User clicks "Thử lại" (Retry): second attempt succeeds
      const profile = await restoreSession({
        authServiceInstance: mockAuthService,
      });

      expect(profile.id).toBe('user-retry-success');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.fullName).toBe('Retry Success User');
    });
  });

  describe('teardownSession (Unified 5-Path Logout Seam)', () => {
    let mockStorage: StorageAdapter;
    let mockCookieAdapter: CookieAdapter;
    let mockNavigation: NavigationAdapter;
    let mockQueryClient: any;
    let storageMap: Map<string, string>;
    let cookiesRemoved: string[];

    beforeEach(() => {
      storageMap = new Map<string, string>();
      for (const key of USER_STORAGE_KEYS) {
        storageMap.set(key, `data-for-${key}`);
      }

      mockStorage = {
        getItem: jest.fn((k: string) => storageMap.get(k) ?? null),
        setItem: jest.fn((k: string, v: string) => storageMap.set(k, v)),
        removeItem: jest.fn((k: string) => storageMap.delete(k)),
      };

      cookiesRemoved = [];
      mockCookieAdapter = {
        remove: jest.fn((name: string) => cookiesRemoved.push(name)),
        get: jest.fn(),
      };

      mockNavigation = {
        replace: jest.fn(),
        navigate: jest.fn(),
      };

      mockQueryClient = {
        clear: jest.fn(),
      };

      useAuthStore.setState({
        user: { id: 'active-user', fullName: 'User Active' } as any,
        isAuthenticated: true,
      });
    });

    it('wipes Zustand auth state, QueryClient cache, cookies, and all user storage keys', async () => {
      await teardownSession({
        queryClient: mockQueryClient,
        storage: mockStorage,
        cookieAdapter: mockCookieAdapter,
        navigation: mockNavigation,
        redirectTo: '/login',
      });

      // 1. TanStack Query cache is cleared
      expect(mockQueryClient.clear).toHaveBeenCalled();

      // 2. csrf_token cookie is removed
      expect(mockCookieAdapter.remove).toHaveBeenCalledWith('csrf_token', { path: '/' });

      // 3. All 6 user-scoped storage keys are removed from localStorage
      for (const key of USER_STORAGE_KEYS) {
        expect(mockStorage.removeItem).toHaveBeenCalledWith(key);
      }
      expect(storageMap.size).toBe(0);

      // 4. Zustand auth store is reset
      const store = useAuthStore.getState();
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);

      // 5. Navigation replaced to safe URL
      expect(mockNavigation.replace).toHaveBeenCalledWith('/login');
    });

    it('clears registered QueryClient automatically when not passed explicitly', async () => {
      registerQueryClient(mockQueryClient);

      await teardownSession({
        storage: mockStorage,
        cookieAdapter: mockCookieAdapter,
        navigation: mockNavigation,
      });

      expect(mockQueryClient.clear).toHaveBeenCalled();
      registerQueryClient(null);
    });

    it('sanitizes redirectTo parameter against open redirects', async () => {
      await teardownSession({
        storage: mockStorage,
        cookieAdapter: mockCookieAdapter,
        navigation: mockNavigation,
        redirectTo: '//evil.com/steal-token',
      });

      // Dangerous //evil.com must be sanitized to default /login
      expect(mockNavigation.replace).toHaveBeenCalledWith('/login');
    });
  });
});
