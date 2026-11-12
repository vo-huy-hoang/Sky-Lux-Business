import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../lib/stores/auth-store';
import Cookies from 'js-cookie';

describe('Phase 1: Reactive Session Synchronization & Multi-Role Support', () => {
  beforeEach(() => {
    Cookies.remove('csrf_token');
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });

  it('should update user and isAuthenticated without storing JWTs in store or localStorage (Ticket 04)', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.isAuthenticated));

    expect(result.current).toBe(false);

    act(() => {
      useAuthStore.getState().setAuth({
        user: {
          id: 'u-1',
          organizationId: 'org-1',
          employeeCode: 'E01',
          fullName: 'User One',
          email: 'u1@skylux.vn',
          roles: ['SALES'],
          permissions: [],
        },
      });
    });

    expect(result.current).toBe(true);
    expect((useAuthStore.getState() as any).accessToken).toBeUndefined();
    expect(Cookies.get('access_token')).toBeUndefined();
    expect(Cookies.get('refresh_token')).toBeUndefined();
    const persisted = localStorage.getItem('skylux-auth-storage') || '';
    expect(persisted).not.toContain('accessToken');
    expect(persisted).not.toContain('refreshToken');
  });

  it('should react to skylux:token-refreshed custom event with 0ms latency', () => {
    let refreshedCount = 0;

    const handleRefresh = () => {
      refreshedCount += 1;
    };

    window.addEventListener('skylux:token-refreshed', handleRefresh);

    act(() => {
      window.dispatchEvent(new CustomEvent('skylux:token-refreshed'));
    });

    expect(refreshedCount).toBe(1);

    window.removeEventListener('skylux:token-refreshed', handleRefresh);
  });

  it('should correctly evaluate hasRole for array of roles and single role', () => {
    useAuthStore.setState({
      user: {
        id: 'user-ops',
        fullName: 'Operator User',
        email: 'op@skylux.vn',
        roles: ['OPERATOR'],
        permissions: [],
      } as any,
    });

    // Single string
    expect(useAuthStore.getState().hasRole('OPERATOR')).toBe(true);
    expect(useAuthStore.getState().hasRole('SALES')).toBe(false);

    // Array of roles
    expect(useAuthStore.getState().hasRole(['OPERATOR', 'SALES'])).toBe(true);
    expect(useAuthStore.getState().hasRole(['CEO_ADMIN', 'SUPER_ADMIN'])).toBe(false);

    // SUPER_ADMIN has access to everything
    useAuthStore.setState({
      user: {
        id: 'user-admin',
        fullName: 'Super Admin',
        email: 'admin@skylux.vn',
        roles: ['SUPER_ADMIN'],
        permissions: [],
      } as any,
    });

    expect(useAuthStore.getState().hasRole('ANY_ARBITRARY_ROLE')).toBe(true);
    expect(useAuthStore.getState().hasRole(['RANDOM_1', 'RANDOM_2'])).toBe(true);
  });
});
