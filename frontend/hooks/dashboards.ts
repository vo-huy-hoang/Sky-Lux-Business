import { useQuery } from '@tanstack/react-query';
import { dashboardsService } from '@/services/dashboards.service';
import { queryKeys } from '@/lib/query-keys';
import { QueryDashboardParams } from '@/types/dashboard';

/**
 * Hook lấy dữ liệu Dashboard Sales
 */
export function useSalesDashboard(params?: QueryDashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.sales(params),
    queryFn: () => dashboardsService.getSalesDashboard(params),
    ...options,
  });
}

/**
 * Hook lấy dữ liệu Dashboard Operator (Vận hành)
 */
export function useOperatorDashboard(params?: QueryDashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.operator(params),
    queryFn: () => dashboardsService.getOperatorDashboard(params),
    ...options,
  });
}

/**
 * Hook lấy dữ liệu Dashboard CEO (Giám đốc)
 */
export function useCeoDashboard(params?: QueryDashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.ceo(params),
    queryFn: () => dashboardsService.getCeoDashboard(params),
    ...options,
  });
}

/**
 * Hook lấy tổng hợp hiệu suất và doanh thu theo Sales (API-DASHBOARD-004)
 */
export function useOperatorSalesSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.operatorSalesSummary(),
    queryFn: () => dashboardsService.getOperatorSalesSummary(),
    ...options,
  });
}

/**
 * Hook lấy xu hướng tạo hồ sơ và doanh thu theo tháng (API-DASHBOARD-005)
 */
export function useOperatorMonthlyTrend(months = 6, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.operatorMonthlyTrend(),
    queryFn: () => dashboardsService.getOperatorMonthlyTrend(months),
    ...options,
  });
}


