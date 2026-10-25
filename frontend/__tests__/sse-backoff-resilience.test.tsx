import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { calculateSseBackoffWithJitter } from '@/lib/backoff';
import { useUIStore } from '@/lib/stores/ui-store';
import { RealtimeConnectionIndicator } from '@/components/common/RealtimeConnectionIndicator';

describe('Phase 4: SSE Resilience & Exponential Backoff with Jitter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('calculateSseBackoffWithJitter (Ticket 08 Specification)', () => {
    it('returns 0ms for attempt 0 or negative', () => {
      expect(calculateSseBackoffWithJitter(0)).toBe(0);
      expect(calculateSseBackoffWithJitter(-1)).toBe(0);
      expect(calculateSseBackoffWithJitter(-5)).toBe(0);
    });

    it('attempt 1: 1s + jitter 0–500ms (1000ms - 1500ms)', () => {
      // Mock Math.random = 0
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(calculateSseBackoffWithJitter(1)).toBe(1000);

      // Mock Math.random = 0.5
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(calculateSseBackoffWithJitter(1)).toBe(1250);

      // Mock Math.random = 0.999
      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(calculateSseBackoffWithJitter(1)).toBe(1500);
    });

    it('attempt 2: 2s + jitter 0–1000ms (2000ms - 3000ms)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(calculateSseBackoffWithJitter(2)).toBe(2000);

      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(calculateSseBackoffWithJitter(2)).toBe(2500);

      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(calculateSseBackoffWithJitter(2)).toBe(2999);
    });

    it('attempt 3: 4s + jitter 0–2000ms (4000ms - 6000ms)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(calculateSseBackoffWithJitter(3)).toBe(4000);

      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(calculateSseBackoffWithJitter(3)).toBe(5000);

      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(calculateSseBackoffWithJitter(3)).toBe(5998);
    });

    it('attempt >= 5: caps strictly at maxDelay (15000ms / 15 seconds)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      for (let attempt = 5; attempt <= 15; attempt++) {
        const delay = calculateSseBackoffWithJitter(attempt);
        expect(delay).toBeLessThanOrEqual(15000);
      }
    });

    it('never produces negative delay or exceeds bounds across 100 randomized runs', () => {
      for (let i = 0; i < 100; i++) {
        const delay1 = calculateSseBackoffWithJitter(1);
        expect(delay1).toBeGreaterThanOrEqual(1000);
        expect(delay1).toBeLessThanOrEqual(1500);

        const delay2 = calculateSseBackoffWithJitter(2);
        expect(delay2).toBeGreaterThanOrEqual(2000);
        expect(delay2).toBeLessThanOrEqual(3000);

        const delay3 = calculateSseBackoffWithJitter(3);
        expect(delay3).toBeGreaterThanOrEqual(4000);
        expect(delay3).toBeLessThanOrEqual(6000);
      }
    });
  });

  describe('RealtimeConnectionIndicator Component (Ticket 08 Specification)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      act(() => {
        useUIStore.setState({
          connectionStatus: 'connected',
          notificationsStatus: 'connected',
          chatStatus: 'idle',
          reconnectAttempt: 0,
        });
      });
    });

    it('remains completely hidden when initially connected', () => {
      const { container } = render(<RealtimeConnectionIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('does not display immediately on reconnecting; waits for 5-second threshold', () => {
      const { container } = render(<RealtimeConnectionIndicator />);

      act(() => {
        useUIStore.getState().setConnectionStatus('reconnecting');
      });

      // At 2 seconds: still hidden (avoiding layout jitter for transient network drop)
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(container.firstChild).toBeNull();

      // At 5 seconds: indicator reveals itself
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(container.firstChild).not.toBeNull();
      expect(
        screen.getByText('Đang tự động kết nối lại dữ liệu thời gian thực...'),
      ).toBeInTheDocument();
    });

    it('transitions to green and disappears after 2 seconds once reconnected', () => {
      const { container } = render(<RealtimeConnectionIndicator />);

      // Trigger reconnecting for 5 seconds
      act(() => {
        useUIStore.getState().setConnectionStatus('reconnecting');
      });
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(
        screen.getByText('Đang tự động kết nối lại dữ liệu thời gian thực...'),
      ).toBeInTheDocument();

      // Backend comes back online: connected
      act(() => {
        useUIStore.getState().setConnectionStatus('connected');
      });

      // Turns green with success message
      expect(
        screen.getByText('Đã kết nối dữ liệu thời gian thực'),
      ).toBeInTheDocument();

      // At 1.5s: still visible
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(
        screen.getByText('Đã kết nối dữ liệu thời gian thực'),
      ).toBeInTheDocument();

      // At 2.0s: cleanly dismissed
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(container.firstChild).toBeNull();
    });

    it('shows retry button when connection enters reconnect_failed state', () => {
      render(<RealtimeConnectionIndicator />);

      act(() => {
        useUIStore.getState().setConnectionStatus('reconnect_failed');
      });

      expect(screen.getByText('Mất kết nối thời gian thực')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();

      // Clicking retry triggers reconnect state
      act(() => {
        screen.getByRole('button', { name: /Thử lại/i }).click();
      });
      expect(useUIStore.getState().connectionStatus).toBe('reconnecting');
    });

    it('safely cleans up all pending timers on component unmount', () => {
      const { unmount } = render(<RealtimeConnectionIndicator />);

      act(() => {
        useUIStore.getState().setConnectionStatus('reconnecting');
      });

      // Unmounting before 5s
      unmount();

      // Advancing timer does not throw error or set state on unmounted component
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(10000);
        });
      }).not.toThrow();
    });
  });
});
