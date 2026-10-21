import { useQuery } from '@tanstack/react-query';
import { dashboardsService } from '@/services/dashboards.service';
import { queryKeys } from '@/lib/query-keys';
import { isCanceledError } from '@/lib/api-client';
import {
  QueryDashboardParams,
  SalesDashboardData,
  OperatorDashboardData,
  CeoDashboardData,
  OperatorSalesSummaryItem,
  OperatorMonthlyTrendItem,
  CeoMonthlyTrendItem,
} from '@/types/dashboard';

/**
 * Cấu hình Cache & Retry tối ưu cho Dashboard Hooks
 */
export const DASHBOARD_STALE_TIME = 60 * 1000; // 1 phút bộ nhớ đệm
export const DASHBOARD_GC_TIME = 5 * 60 * 1000; // 5 phút garbage collection

export const dashboardRetryFn = (failureCount: number, error: any): boolean => {
  // 1. Không retry nếu request bị hủy chủ động bởi AbortController / Unmount
  if (isCanceledError(error)) return false;

  // 2. Không retry nếu lỗi xác thực/phân quyền (401, 403)
  const status = error?.status || error?.response?.status;
  if (status === 401 || status === 403) return false;

  // 3. Cho phép thử lại tối đa 2 lần với các lỗi mạng hoặc lỗi tạm thời (429, 500, 502, 503)
  return failureCount < 2;
};

export const dashboardRetryDelayFn = (attemptIndex: number, error: any): number => {
  // Nếu gặp lỗi rate limit 429 có kèm thời gian khóa từ server
  if (error?.isRateLimited && error?.lockoutSeconds) {
    return Math.min(error.lockoutSeconds * 1000, 5000);
  }
  // Exponential Backoff với Random Jitter: 1s, 2s... tối đa 5s
  const baseDelay = Math.min(1000 * 2 ** attemptIndex, 5000);
  const jitter = Math.random() * 500;
  return baseDelay + jitter;
};

export interface DashboardQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: boolean | number | ((failureCount: number, error: any) => boolean);
  retryDelay?: number | ((attemptIndex: number, error: any) => number);
  refetchOnWindowFocus?: boolean;
}

const DEFAULT_DASHBOARD_QUERY_OPTIONS: DashboardQueryOptions = {
  staleTime: DASHBOARD_STALE_TIME,
  gcTime: DASHBOARD_GC_TIME,
  retry: dashboardRetryFn,
  retryDelay: dashboardRetryDelayFn,
  refetchOnWindowFocus: false,
};

/**
 * Hook lấy dữ liệu Dashboard Sales
 */
export function useSalesDashboard(params?: QueryDashboardParams, options?: DashboardQueryOptions) {
  return useQuery<SalesDashboardData>({
    queryKey: queryKeys.dashboards.sales(params),
    queryFn: ({ signal }) => dashboardsService.getSalesDashboard(params, { signal }),
    ...DEFAULT_DASHBOARD_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Hook lấy dữ liệu Dashboard Operator (Vận hành)
 */
export function useOperatorDashboard(params?: QueryDashboardParams, options?: DashboardQueryOptions) {
  return useQuery<OperatorDashboardData>({
    queryKey: queryKeys.dashboards.operator(params),
    queryFn: ({ signal }) => dashboardsService.getOperatorDashboard(params, { signal }),
    ...DEFAULT_DASHBOARD_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Hook lấy dữ liệu Dashboard CEO (Giám đốc)
 */
export function useCeoDashboard(params?: QueryDashboardParams, options?: DashboardQueryOptions) {
  return useQuery<CeoDashboardData>({
    queryKey: queryKeys.dashboards.ceo(params),
    queryFn: ({ signal }) => dashboardsService.getCeoDashboard(params, { signal }),
    ...DEFAULT_DASHBOARD_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Hook lấy tổng hợp hiệu suất và doanh thu theo Sales (API-DASHBOARD-004)
 */
export function useOperatorSalesSummary(options?: DashboardQueryOptions) {
  return useQuery<OperatorSalesSummaryItem[]>({
    queryKey: queryKeys.dashboards.operatorSalesSummary(),
    queryFn: ({ signal }) => dashboardsService.getOperatorSalesSummary({ signal }),
    ...DEFAULT_DASHBOARD_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Hook lấy xu hướng tạo hồ sơ và doanh thu theo tháng (API-DASHBOARD-005)
 */
export function useOperatorMonthlyTrend(months = 6, options?: DashboardQueryOptions) {
  return useQuery<OperatorMonthlyTrendItem[]>({
    queryKey: queryKeys.dashboards.operatorMonthlyTrend(),
    queryFn: ({ signal }) => dashboardsService.getOperatorMonthlyTrend(months, { signal }),
    ...DEFAULT_DASHBOARD_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Hook lấy xu hướng doanh thu, chi phí, lợi nhuận 12 tháng cho CEO (API-DASHBOARD-006)
 */
export function useCeoMonthlyTrend(year = new Date().getFullYear(), options?: DashboardQueryOptions, allTime = false) {
  return useQuery<CeoMonthlyTrendItem[]>({
    queryKey: queryKeys.dashboards.ceoMonthlyTrend(year, allTime),
    queryFn: ({ signal }) => dashboardsService.getCeoMonthlyTrend(year, { signal }, allTime),
    ...DEFAULT_DASHBOARD_QUERY_OPTIONS,
    ...options,
  });
}
