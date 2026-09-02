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
    queryFn: ({ signal }) => dashboardsService.getSalesDashboard(params, { signal }),
    ...options,
  });
}

/**
 * Hook lấy dữ liệu Dashboard Operator (Vận hành)
 */
export function useOperatorDashboard(params?: QueryDashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.operator(params),
    queryFn: ({ signal }) => dashboardsService.getOperatorDashboard(params, { signal }),
    ...options,
  });
}

/**
 * Hook lấy dữ liệu Dashboard CEO (Giám đốc)
 */
export function useCeoDashboard(params?: QueryDashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.ceo(params),
    queryFn: ({ signal }) => dashboardsService.getCeoDashboard(params, { signal }),
    ...options,
  });
}

/**
 * Hook lấy tổng hợp hiệu suất và doanh thu theo Sales (API-DASHBOARD-004)
 */
export function useOperatorSalesSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.operatorSalesSummary(),
    queryFn: ({ signal }) => dashboardsService.getOperatorSalesSummary({ signal }),
    ...options,
  });
}

/**
 * Hook lấy xu hướng tạo hồ sơ và doanh thu theo tháng (API-DASHBOARD-005)
 */
export function useOperatorMonthlyTrend(months = 6, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.operatorMonthlyTrend(),
    queryFn: ({ signal }) => dashboardsService.getOperatorMonthlyTrend(months, { signal }),
    ...options,
  });
}

/**
 * Hook lấy xu hướng doanh thu, chi phí, lợi nhuận 12 tháng cho CEO (API-DASHBOARD-006)
 */
export function useCeoMonthlyTrend(year = new Date().getFullYear(), options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboards.ceoMonthlyTrend(year),
    queryFn: ({ signal }) => dashboardsService.getCeoMonthlyTrend(year, { signal }),
    ...options,
  });
}




