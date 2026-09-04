import { act } from '@testing-library/react';
import { useUIStore, computeCombinedConnectionStatus } from '../lib/stores/ui-store';

describe('Phase 3 (FE-OPT-03): Dual SSE Connection Lifecycle & Page Visibility Coordination', () => {
  beforeEach(() => {
    act(() => {
      useUIStore.setState({
        connectionStatus: 'connected',
        notificationsStatus: 'connected',
        chatStatus: 'idle',
        reconnectAttempt: 0,
        reconnectTrigger: 0,
      });
    });
  });

  describe('Dual SSE State Coordination (computeCombinedConnectionStatus)', () => {
    it('should return connected when notifications is connected and chat is idle', () => {
      expect(computeCombinedConnectionStatus('connected', 'idle')).toBe('connected');
    });

    it('should prioritize offline if either stream detects offline network', () => {
      expect(computeCombinedConnectionStatus('offline', 'connected')).toBe('offline');
      expect(computeCombinedConnectionStatus('connected', 'offline')).toBe('offline');
      expect(computeCombinedConnectionStatus('offline', 'idle')).toBe('offline');
    });

    it('should return reconnect_failed if either active stream has failed capped retries', () => {
      expect(computeCombinedConnectionStatus('reconnect_failed', 'idle')).toBe('reconnect_failed');
      expect(computeCombinedConnectionStatus('connected', 'reconnect_failed')).toBe('reconnect_failed');
    });

    it('should return reconnecting if any active stream is in reconnecting state', () => {
      expect(computeCombinedConnectionStatus('reconnecting', 'connected')).toBe('reconnecting');
      expect(computeCombinedConnectionStatus('connected', 'reconnecting')).toBe('reconnecting');
      expect(computeCombinedConnectionStatus('reconnecting', 'idle')).toBe('reconnecting');
    });

    it('should return connected when both streams are connected', () => {
      expect(computeCombinedConnectionStatus('connected', 'connected')).toBe('connected');
    });
  });

  describe('Zustand UIStore Dual SSE Mutations', () => {
    it('should update notificationsStatus and automatically recalculate combined connectionStatus', () => {
      act(() => {
        useUIStore.getState().setNotificationsStatus('reconnecting');
      });
      expect(useUIStore.getState().notificationsStatus).toBe('reconnecting');
      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');

      act(() => {
        useUIStore.getState().setNotificationsStatus('connected');
      });
      expect(useUIStore.getState().notificationsStatus).toBe('connected');
      expect(useUIStore.getState().connectionStatus).toBe('connected');
    });

    it('should update chatStatus and automatically recalculate combined connectionStatus', () => {
      act(() => {
        useUIStore.getState().setChatStatus('reconnecting');
      });
      expect(useUIStore.getState().chatStatus).toBe('reconnecting');
      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');

      act(() => {
        useUIStore.getState().setChatStatus('connected');
      });
      expect(useUIStore.getState().chatStatus).toBe('connected');
      expect(useUIStore.getState().connectionStatus).toBe('connected');

      // When user leaves chat, status returns to idle without disrupting notifications
      act(() => {
        useUIStore.getState().setChatStatus('idle');
      });
      expect(useUIStore.getState().chatStatus).toBe('idle');
      expect(useUIStore.getState().connectionStatus).toBe('connected');
    });
  });

  describe('Page Visibility Event Coordination Simulation', () => {
    let originalVisibilityState: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    });

    afterEach(() => {
      if (originalVisibilityState) {
        Object.defineProperty(document, 'visibilityState', originalVisibilityState);
      }
    });

    it('should support visibilitychange event listeners without throwing', () => {
      const visibilityListener = jest.fn();
      document.addEventListener('visibilitychange', visibilityListener);

      // Simulate tab going hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(visibilityListener).toHaveBeenCalledTimes(1);
      expect(document.visibilityState).toBe('hidden');

      // Simulate tab becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(visibilityListener).toHaveBeenCalledTimes(2);
      expect(document.visibilityState).toBe('visible');

      document.removeEventListener('visibilitychange', visibilityListener);
    });
  });
});
