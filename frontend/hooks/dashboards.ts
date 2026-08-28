import { useQuery } from '@tanstack/react-query';
import { dashboardsService } from '@/services/dashboards.service';
import { QueryDashboardParams } from '@/types/dashboard';

/**
 * Hook lấy dữ liệu Dashboard Sales
 */
export function useSalesDashboard(params?: QueryDashboardParams) {
  return useQuery({
    queryKey: ['dashboard-sales', params],
    queryFn: () => dashboardsService.getSalesDashboard(params),
  });
}

/**
 * Hook lấy dữ liệu Dashboard Operator (Vận hành)
 */
export function useOperatorDashboard(params?: QueryDashboardParams) {
  return useQuery({
    queryKey: ['dashboard-operator', params],
    queryFn: () => dashboardsService.getOperatorDashboard(params),
  });
}

/**
 * Hook lấy dữ liệu Dashboard CEO (Giám đốc)
 */
export function useCeoDashboard(params?: QueryDashboardParams) {
  return useQuery({
    queryKey: ['dashboard-ceo', params],
    queryFn: () => dashboardsService.getCeoDashboard(params),
  });
}
