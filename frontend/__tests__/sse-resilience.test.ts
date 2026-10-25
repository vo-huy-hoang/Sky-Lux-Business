import { calculateBackoffWithJitter } from '../hooks/chat';
import { useUIStore } from '../lib/stores/ui-store';

describe('Phase 21: SSE Resilience & Exponential Backoff with Full Jitter', () => {
  beforeEach(() => {
    useUIStore.setState({
      connectionStatus: 'connected',
      reconnectAttempt: 0,
    });
  });

  describe('calculateBackoffWithJitter algorithm', () => {
    it('should return 0ms for attempt 0 or negative (Fast Immediate Retry)', () => {
      expect(calculateBackoffWithJitter(0)).toBe(0);
      expect(calculateBackoffWithJitter(-1)).toBe(0);
    });

    it('should calculate jittered delay within expected bounds for attempt 1', () => {
      const baseDelay = 500;
      const maxDelay = 5000;

      for (let i = 0; i < 50; i++) {
        const delay = calculateBackoffWithJitter(1, baseDelay, maxDelay);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(baseDelay);
      }
    });

    it('should calculate exponential delay within bounds for attempt 2 and 3', () => {
      const baseDelay = 500;
      const maxDelay = 5000;

      for (let i = 0; i < 50; i++) {
        const delayAttempt2 = calculateBackoffWithJitter(2, baseDelay, maxDelay);
        expect(delayAttempt2).toBeGreaterThanOrEqual(0);
        expect(delayAttempt2).toBeLessThanOrEqual(baseDelay * 2); // 1000ms

        const delayAttempt3 = calculateBackoffWithJitter(3, baseDelay, maxDelay);
        expect(delayAttempt3).toBeGreaterThanOrEqual(0);
        expect(delayAttempt3).toBeLessThanOrEqual(baseDelay * 4); // 2000ms
      }
    });

    it('should never exceed the maximum capped delay (5000ms)', () => {
      const baseDelay = 500;
      const maxDelay = 5000;

      for (let attempt = 4; attempt <= 15; attempt++) {
        for (let i = 0; i < 10; i++) {
          const delay = calculateBackoffWithJitter(attempt, baseDelay, maxDelay);
          expect(delay).toBeGreaterThanOrEqual(0);
          expect(delay).toBeLessThanOrEqual(maxDelay);
        }
      }
    });
  });

  describe('Zustand connectionStatus & reconnectAttempt workflow', () => {
    it('should correctly reflect disconnected and reconnecting states', () => {
      expect(useUIStore.getState().connectionStatus).toBe('connected');
      expect(useUIStore.getState().reconnectAttempt).toBe(0);

      // Simulating first retry attempt
      useUIStore.getState().setConnectionStatus('reconnecting');
      useUIStore.getState().setReconnectAttempt(1);
      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');
      expect(useUIStore.getState().reconnectAttempt).toBe(1);

      // Simulating second retry attempt
      useUIStore.getState().setReconnectAttempt(2);
      expect(useUIStore.getState().reconnectAttempt).toBe(2);

      // Simulating offline state (browser offline event)
      useUIStore.getState().setConnectionStatus('offline');
      expect(useUIStore.getState().connectionStatus).toBe('offline');

      // Simulating successful reconnection (onopen)
      useUIStore.getState().setConnectionStatus('connected');
      useUIStore.getState().setReconnectAttempt(0);
      expect(useUIStore.getState().connectionStatus).toBe('connected');
      expect(useUIStore.getState().reconnectAttempt).toBe(0);
    });
  });
});
