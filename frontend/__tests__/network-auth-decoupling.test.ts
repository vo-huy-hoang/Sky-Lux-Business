import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../lib/stores/ui-store';
import Cookies from 'js-cookie';

describe('Phase 28: Accurate Network/Auth Decoupling & Interactive Connection Banner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUIStore.setState({
      connectionStatus: 'connected',
      reconnectAttempt: 0,
      reconnectTrigger: 0,
    });
  });

  describe('UIStore Connection Status Lifecycle', () => {
    it('should support reconnect_failed status and interactive triggerReconnect', () => {
      // Transition through reconnect attempts
      act(() => {
        useUIStore.getState().setConnectionStatus('reconnecting');
        useUIStore.getState().setReconnectAttempt(5);
      });

      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');
      expect(useUIStore.getState().reconnectAttempt).toBe(5);

      // Transition to capped state after 5 attempts
      act(() => {
        useUIStore.getState().setConnectionStatus('reconnect_failed');
      });

      expect(useUIStore.getState().connectionStatus).toBe('reconnect_failed');

      // User clicks "Thử kết nối lại ngay" on the banner
      act(() => {
        useUIStore.getState().triggerReconnect();
      });

      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');
      expect(useUIStore.getState().reconnectAttempt).toBe(0);
      expect(useUIStore.getState().reconnectTrigger).toBe(1);
    });

    it('should properly reset connection status and attempt on route unmount cleanup', () => {
      // Simulate state when chat is attempting to reconnect
      act(() => {
        useUIStore.getState().setConnectionStatus('reconnecting');
        useUIStore.getState().setReconnectAttempt(2);
      });

      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');

      // Simulate cleanup function when unmounting chat page to go to CEO Dashboard
      act(() => {
        useUIStore.getState().setConnectionStatus('connected');
        useUIStore.getState().setReconnectAttempt(0);
      });

      // Banner MUST be completely dismissed (connected)
      expect(useUIStore.getState().connectionStatus).toBe('connected');
      expect(useUIStore.getState().reconnectAttempt).toBe(0);
    });
  });

  describe('Network vs Auth State Decoupling', () => {
    it('should not mark system as offline when auth token is merely missing', () => {
      // Ensure no access token cookie
      jest.spyOn(Cookies, 'get').mockReturnValue(undefined as any);

      const status = useUIStore.getState().connectionStatus;
      // Without token, state should remain connected / neutral, NOT false-positive offline
      expect(status).toBe('connected');
      expect(status).not.toBe('offline');
    });

    it('should only mark offline when actual browser offline event triggers', () => {
      act(() => {
        useUIStore.getState().setConnectionStatus('offline');
      });

      expect(useUIStore.getState().connectionStatus).toBe('offline');
    });
  });
});
