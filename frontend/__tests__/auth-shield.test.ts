import { useAuthStore } from '../lib/stores/auth-store';
import { apiClient } from '../lib/api-client';

describe('Phase 24: Distributed Throttler & Auth Shield (Frontend)', () => {
  beforeEach(() => {
    useAuthStore.setState({ lockoutSeconds: 0 });
  });

  describe('useAuthStore Rate Limit State', () => {
    it('should initialize with lockoutSeconds = 0', () => {
      expect(useAuthStore.getState().lockoutSeconds).toBe(0);
    });

    it('should update lockoutSeconds via setLockoutSeconds', () => {
      useAuthStore.getState().setLockoutSeconds(60);
      expect(useAuthStore.getState().lockoutSeconds).toBe(60);
    });

    it('should decrement lockoutSeconds and clamp at 0', () => {
      useAuthStore.getState().setLockoutSeconds(2);
      useAuthStore.getState().decrementLockoutSeconds();
      expect(useAuthStore.getState().lockoutSeconds).toBe(1);

      useAuthStore.getState().decrementLockoutSeconds();
      expect(useAuthStore.getState().lockoutSeconds).toBe(0);

      // Decrementing again should stay at 0
      useAuthStore.getState().decrementLockoutSeconds();
      expect(useAuthStore.getState().lockoutSeconds).toBe(0);
    });
  });

  describe('apiClient 429 Too Many Requests Interceptor', () => {
    it('should parse 429 error and attach isRateLimited and lockoutSeconds', async () => {
      const mock429Error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            statusCode: 429,
            message: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau 45 giây.',
            lockoutSeconds: 45,
          },
        },
      };

      // Mock apiClient post rejecting with mock429Error
      const interceptor = (apiClient.interceptors.response as any).handlers[0].rejected;

      try {
        await interceptor(mock429Error);
        fail('Should have rejected with customError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(Error);
        expect(err.status).toBe(429);
        expect(err.isRateLimited).toBe(true);
        expect(err.lockoutSeconds).toBe(45);
        expect(err.message).toContain('45 giây');
      }
    });
  });

  describe('useAuthStore hasRole Multi-Role support', () => {
    it('should return true when single role matches', () => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'sales@skylux.vn',
          fullName: 'Sales User',
          organizationId: 'org1',
          departmentId: 'dept1',
          roles: ['SALES'],
          permissions: [],
        } as any,
      });

      expect(useAuthStore.getState().hasRole('SALES')).toBe(true);
      expect(useAuthStore.getState().hasRole('OPERATOR')).toBe(false);
    });

    it('should return true when any role in array matches', () => {
      useAuthStore.setState({
        user: {
          id: 'u2',
          email: 'ceo@skylux.vn',
          fullName: 'CEO User',
          organizationId: 'org1',
          departmentId: 'dept1',
          roles: ['CEO_ADMIN'],
          permissions: [],
        } as any,
      });

      expect(useAuthStore.getState().hasRole(['SUPER_ADMIN', 'CEO_ADMIN'])).toBe(true);
      expect(useAuthStore.getState().hasRole(['SALES', 'OPERATOR'])).toBe(false);
    });

    it('should always return true for SUPER_ADMIN', () => {
      useAuthStore.setState({
        user: {
          id: 'u3',
          email: 'admin@skylux.vn',
          fullName: 'Admin User',
          organizationId: 'org1',
          departmentId: 'dept1',
          roles: ['SUPER_ADMIN'],
          permissions: [],
        } as any,
      });

      expect(useAuthStore.getState().hasRole('ANY_ROLE')).toBe(true);
      expect(useAuthStore.getState().hasRole(['ROLE_A', 'ROLE_B'])).toBe(true);
    });
  });
});

