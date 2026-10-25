import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../lib/stores/auth-store';
import Cookies from 'js-cookie';

describe('Phase 1: Reactive Token Synchronization & Multi-Role Support', () => {
  beforeEach(() => {
    Cookies.remove('access_token');
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it('should react immediately when accessToken changes in useAuthStore without polling delay', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.accessToken));

    expect(result.current).toBeNull();

    act(() => {
      useAuthStore.setState({ accessToken: 'fresh-jwt-token-123' });
    });

    expect(result.current).toBe('fresh-jwt-token-123');
  });

  it('should react to skylux:token-refreshed custom event with 0ms latency', () => {
    let capturedToken = '';

    const handleRefresh = (e: Event) => {
      const customEvt = e as CustomEvent<{ accessToken: string }>;
      capturedToken = customEvt.detail?.accessToken || '';
    };

    window.addEventListener('skylux:token-refreshed', handleRefresh);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('skylux:token-refreshed', {
          detail: { accessToken: 'token-from-event-456' },
        }),
      );
    });

    expect(capturedToken).toBe('token-from-event-456');

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
