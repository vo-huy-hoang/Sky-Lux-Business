import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { isCanceledError } from '../lib/api-client';
import { useFilterStore } from '../lib/stores/filter-store';

describe('Phase 23: Global Request Cancellation with AbortController', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  describe('isCanceledError helper', () => {
    it('should return true for Axios CanceledError', () => {
      const canceledError = new axios.CanceledError('canceled');
      expect(isCanceledError(canceledError)).toBe(true);
    });

    it('should return true for AbortError', () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      expect(isCanceledError(abortError)).toBe(true);
    });

    it('should return false for regular Network Error', () => {
      const regularError = new Error('Network Error: 500 Internal Server Error');
      expect(isCanceledError(regularError)).toBe(false);
    });

    it('should return false for null, undefined, or string', () => {
      expect(isCanceledError(null)).toBe(false);
      expect(isCanceledError(undefined)).toBe(false);
      expect(isCanceledError('canceled')).toBe(false);
    });
  });

  describe('AbortController Signal Propagation in TanStack Query', () => {
    it('should trigger signal.aborted when query is cancelled', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      });

      let capturedSignal: AbortSignal | undefined;

      const promise = queryClient.fetchQuery({
        queryKey: ['test-cancel-query'],
        queryFn: ({ signal }) => {
          capturedSignal = signal;
          return new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(new axios.CanceledError('Query was cancelled'));
            });
          });
        },
      });

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal!.aborted).toBe(false);

      // Cancel the query
      await queryClient.cancelQueries({ queryKey: ['test-cancel-query'] });

      expect(capturedSignal!.aborted).toBe(true);
      await expect(promise).rejects.toThrow();
    });
  });

  describe('useFilterStore State Preservation during Rapid Filter Switching', () => {
    it('should preserve and update filter state correctly without resetting', () => {
      const store = useFilterStore.getState();

      // User rapidly selects 2024 -> 2025 -> 2026
      store.setSelectedYear(2024);
      expect(useFilterStore.getState().selectedYear).toBe(2024);

      store.setSelectedYear(2025);
      expect(useFilterStore.getState().selectedYear).toBe(2025);

      store.setSelectedYear(2026);
      expect(useFilterStore.getState().selectedYear).toBe(2026);

      // User changes period type and date string
      store.setSelectedPeriodType('QUARTERLY');
      store.setDateString('2026-08-15');

      const currentState = useFilterStore.getState();
      expect(currentState.selectedYear).toBe(2026);
      expect(currentState.selectedMonth).toBe(8);
      expect(currentState.selectedPeriodType).toBe('QUARTERLY');
      expect(currentState.dateString).toBe('2026-08-15');
    });
  });
});
