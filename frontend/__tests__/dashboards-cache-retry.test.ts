import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  DASHBOARD_STALE_TIME,
  DASHBOARD_GC_TIME,
  dashboardRetryFn,
  dashboardRetryDelayFn,
  useSalesDashboard,
  useOperatorDashboard,
  useCeoDashboard,
  useOperatorSalesSummary,
  useOperatorMonthlyTrend,
  useCeoMonthlyTrend,
} from '@/hooks/dashboards';
import { dashboardsService } from '@/services/dashboards.service';

jest.mock('@/services/dashboards.service', () => ({
  dashboardsService: {
    getSalesDashboard: jest.fn(),
    getOperatorDashboard: jest.fn(),
    getCeoDashboard: jest.fn(),
    getOperatorSalesSummary: jest.fn(),
    getOperatorMonthlyTrend: jest.fn(),
    getCeoMonthlyTrend: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('FE-DASH-01: Dashboard Cache & Retry Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Constants & Configuration', () => {
    it('should configure 1 minute staleTime (60000ms) to eliminate redundant refetches', () => {
      expect(DASHBOARD_STALE_TIME).toBe(60000);
    });

    it('should configure 5 minutes gcTime (300000ms) for background cache retention', () => {
      expect(DASHBOARD_GC_TIME).toBe(300000);
    });
  });

  describe('Intelligent Retry Decision (dashboardRetryFn)', () => {
    it('should not retry if the request was intentionally aborted or canceled', () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      expect(dashboardRetryFn(0, abortError)).toBe(false);

      const cancelError = new Error('Canceled');
      cancelError.name = 'CanceledError';
      expect(dashboardRetryFn(0, cancelError)).toBe(false);
    });

    it('should not retry on auth/permission errors (401 Unauthorized, 403 Forbidden)', () => {
      expect(dashboardRetryFn(0, { status: 401 })).toBe(false);
      expect(dashboardRetryFn(0, { response: { status: 401 } })).toBe(false);
      expect(dashboardRetryFn(0, { status: 403 })).toBe(false);
      expect(dashboardRetryFn(0, { response: { status: 403 } })).toBe(false);
    });

    it('should allow retry up to 2 times for transient/rate-limit errors (429, 500, network error)', () => {
      const rateLimitError = { status: 429, isRateLimited: true, lockoutSeconds: 30 };
      expect(dashboardRetryFn(0, rateLimitError)).toBe(true);
      expect(dashboardRetryFn(1, rateLimitError)).toBe(true);
      expect(dashboardRetryFn(2, rateLimitError)).toBe(false);

      const serverError = { status: 500 };
      expect(dashboardRetryFn(0, serverError)).toBe(true);
      expect(dashboardRetryFn(1, serverError)).toBe(true);
      expect(dashboardRetryFn(2, serverError)).toBe(false);
    });
  });

  describe('Exponential Backoff with Jitter (dashboardRetryDelayFn)', () => {
    it('should respect lockoutSeconds from 429 response capped at 5000ms', () => {
      const rateLimitError = { isRateLimited: true, lockoutSeconds: 3 };
      const delay = dashboardRetryDelayFn(0, rateLimitError);
      expect(delay).toBe(3000);

      const longLockout = { isRateLimited: true, lockoutSeconds: 60 };
      const maxDelay = dashboardRetryDelayFn(0, longLockout);
      expect(maxDelay).toBe(5000);
    });

    it('should calculate exponential backoff with random jitter for standard errors', () => {
      const stdError = new Error('Network error');
      const delayAttempt0 = dashboardRetryDelayFn(0, stdError);
      // 1000 * 2^0 = 1000 + jitter (0..500)
      expect(delayAttempt0).toBeGreaterThanOrEqual(1000);
      expect(delayAttempt0).toBeLessThanOrEqual(1500);

      const delayAttempt1 = dashboardRetryDelayFn(1, stdError);
      // 1000 * 2^1 = 2000 + jitter (0..500)
      expect(delayAttempt1).toBeGreaterThanOrEqual(2000);
      expect(delayAttempt1).toBeLessThanOrEqual(2500);
    });
  });

  describe('Dashboard Hooks Data Retrieval', () => {
    it('useSalesDashboard should fetch sales dashboard data with signal', async () => {
      const mockData = { revenue: 100, profit: 50, dossiersBreakdown: [], tasksBreakdown: [] };
      (dashboardsService.getSalesDashboard as jest.Mock).mockResolvedValue(mockData);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useSalesDashboard({ periodType: 'MONTHLY' }), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(dashboardsService.getSalesDashboard).toHaveBeenCalledWith(
        { periodType: 'MONTHLY' },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('useCeoDashboard should fetch CEO dashboard data with signal', async () => {
      const mockCeoData = { totalRevenue: 1000, totalProfit: 400, funnel: [], vipCustomers: [], costBreakdown: [], avgDossierClosingDays: 5 };
      (dashboardsService.getCeoDashboard as jest.Mock).mockResolvedValue(mockCeoData);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCeoDashboard({ periodType: 'MONTHLY' }), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCeoData);
      expect(dashboardsService.getCeoDashboard).toHaveBeenCalledWith(
        { periodType: 'MONTHLY' },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('useOperatorDashboard should fetch operator dashboard data with signal', async () => {
      const mockOpData = { activeDossiersCount: 10, priorityBreakdown: [], overdueTasksCount: 2, tasksBreakdown: [], totalSuppliers: 5 };
      (dashboardsService.getOperatorDashboard as jest.Mock).mockResolvedValue(mockOpData);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useOperatorDashboard(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockOpData);
      expect(dashboardsService.getOperatorDashboard).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('useOperatorSalesSummary should fetch sales summary with signal', async () => {
      const mockSummary = [{ salesUserId: 'u1', salesUserName: 'User 1', totalDossiers: 5, approvedDossiers: 3, completedDossiers: 2, completionRate: 0.6, totalRevenue: 500, totalCost: 300, totalProfit: 200 }];
      (dashboardsService.getOperatorSalesSummary as jest.Mock).mockResolvedValue(mockSummary);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useOperatorSalesSummary(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSummary);
      expect(dashboardsService.getOperatorSalesSummary).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('useOperatorMonthlyTrend should fetch monthly trend with signal', async () => {
      const mockTrend = [{ monthKey: '2026-09', label: 'T9/2026', totalDossiers: 10, approvedDossiers: 8, totalRevenue: 1000 }];
      (dashboardsService.getOperatorMonthlyTrend as jest.Mock).mockResolvedValue(mockTrend);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useOperatorMonthlyTrend(6), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockTrend);
      expect(dashboardsService.getOperatorMonthlyTrend).toHaveBeenCalledWith(
        6,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('useCeoMonthlyTrend should fetch CEO monthly trend with signal', async () => {
      const mockCeoTrend = [{ monthKey: '2026-09', label: 'T9/2026', totalRevenue: 1000, totalCost: 600, totalProfit: 400, approvedDossiers: 8 }];
      (dashboardsService.getCeoMonthlyTrend as jest.Mock).mockResolvedValue(mockCeoTrend);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCeoMonthlyTrend(2026), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCeoTrend);
      expect(dashboardsService.getCeoMonthlyTrend).toHaveBeenCalledWith(
        2026,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        false,
      );
    });
  });
});
