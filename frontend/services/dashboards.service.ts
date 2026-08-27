import { apiClient } from '@/lib/api-client';
import {
  QueryDashboardParams,
  SalesDashboardData,
  OperatorDashboardData,
  CeoDashboardData,
} from '@/types/dashboard';

export const dashboardsService = {
  /**
   * API-DASHBOARD-001: Lấy thông tin dashboard cho Sales
   */
  getSalesDashboard: (params?: QueryDashboardParams) => {
    return apiClient.get<any, SalesDashboardData>('/dashboard/sales', { params });
  },

  /**
   * API-DASHBOARD-002: Lấy thông tin dashboard cho Operator (Vận hành)
   */
  getOperatorDashboard: (params?: QueryDashboardParams) => {
    return apiClient.get<any, OperatorDashboardData>('/dashboard/operator', { params });
  },

  /**
   * API-DASHBOARD-003: Lấy thông tin dashboard cho CEO (Giám đốc)
   */
  getCeoDashboard: (params?: QueryDashboardParams) => {
    return apiClient.get<any, CeoDashboardData>('/dashboard/ceo', { params });
  },
};
