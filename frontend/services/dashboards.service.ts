import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  QueryDashboardParams,
  SalesDashboardData,
  OperatorDashboardData,
  CeoDashboardData,
  OperatorSalesSummaryItem,
  OperatorMonthlyTrendItem,
  CeoMonthlyTrendItem,
} from '@/types/dashboard';

export const dashboardsService = {
  /**
   * API-DASHBOARD-001: Lấy thông tin dashboard cho Sales
   */
  getSalesDashboard: (params?: QueryDashboardParams, options?: RequestOptions) => {
    return apiClient.get<any, SalesDashboardData>('/dashboard/sales', {
      params,
      signal: options?.signal,
    });
  },

  /**
   * API-DASHBOARD-002: Lấy thông tin dashboard cho Operator (Vận hành)
   */
  getOperatorDashboard: (params?: QueryDashboardParams, options?: RequestOptions) => {
    return apiClient.get<any, OperatorDashboardData>('/dashboard/operator', {
      params,
      signal: options?.signal,
    });
  },

  /**
   * API-DASHBOARD-003: Lấy thông tin dashboard cho CEO (Giám đốc)
   */
  getCeoDashboard: (params?: QueryDashboardParams, options?: RequestOptions) => {
    return apiClient.get<any, CeoDashboardData>('/dashboard/ceo', {
      params,
      signal: options?.signal,
    });
  },

  /**
   * API-DASHBOARD-004: Tổng hợp hiệu suất và doanh thu theo Sales
   */
  getOperatorSalesSummary: (options?: RequestOptions) => {
    return apiClient.get<any, OperatorSalesSummaryItem[]>('/dashboard/operator/sales-summary', {
      signal: options?.signal,
    });
  },

  /**
   * API-DASHBOARD-005: Xu hướng tạo hồ sơ và doanh thu theo tháng
   */
  getOperatorMonthlyTrend: (months = 6, options?: RequestOptions) => {
    return apiClient.get<any, OperatorMonthlyTrendItem[]>('/dashboard/operator/monthly-trend', {
      params: { months },
      signal: options?.signal,
    });
  },

  /**
   * API-DASHBOARD-006: Xu hướng doanh thu, chi phí, lợi nhuận 12 tháng theo năm cho CEO
   */
  getCeoMonthlyTrend: (year = new Date().getFullYear(), options?: RequestOptions, allTime = false) => {
    return apiClient.get<any, CeoMonthlyTrendItem[]>('/dashboard/ceo/monthly-trend', {
      params: { year, ...(allTime ? { allTime: true } : {}) },
      signal: options?.signal,
    });
  },
};


