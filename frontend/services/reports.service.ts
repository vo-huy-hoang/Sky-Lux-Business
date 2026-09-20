import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  CustomerReportRow,
  ExportReportPayload,
  PaginatedReportResponse,
  ReportQueryParams,
  ReportType,
  RevenueReportRow,
  SalesPerformanceReportRow,
  SupplierReportRow,
} from '@/types/report';
import { PaginatedResponse } from '@/types/api';

export interface SavedReport {
  id: string;
  name: string;
  reportType: string;
  filters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const reportsService = {
  /** API-REPORT-001: Báo cáo doanh thu theo dossier và ngày khóa hồ sơ. */
  getRevenue: (
    params?: ReportQueryParams,
    options?: RequestOptions,
  ): Promise<PaginatedReportResponse<RevenueReportRow>> =>
    apiClient.get<any, PaginatedReportResponse<RevenueReportRow>>('/reports/revenue', {
      params,
      signal: options?.signal,
    }),

  /** API-REPORT-002: Báo cáo hiệu suất theo Sales. */
  getSalesPerformance: (
    params?: ReportQueryParams,
    options?: RequestOptions,
  ): Promise<PaginatedReportResponse<SalesPerformanceReportRow>> =>
    apiClient.get<any, PaginatedReportResponse<SalesPerformanceReportRow>>(
      '/reports/sales-performance',
      { params, signal: options?.signal },
    ),

  /** API-REPORT-003: Báo cáo tổng hợp theo khách hàng. */
  getCustomer: (
    params?: ReportQueryParams,
    options?: RequestOptions,
  ): Promise<PaginatedReportResponse<CustomerReportRow>> =>
    apiClient.get<any, PaginatedReportResponse<CustomerReportRow>>('/reports/customer', {
      params,
      signal: options?.signal,
    }),

  /** API-REPORT-004: Báo cáo chi phí theo nhà cung cấp. */
  getSupplier: (
    params?: ReportQueryParams,
    options?: RequestOptions,
  ): Promise<PaginatedReportResponse<SupplierReportRow>> =>
    apiClient.get<any, PaginatedReportResponse<SupplierReportRow>>('/reports/supplier', {
      params,
      signal: options?.signal,
    }),

  /** API-REPORT-005: Tạo và tải file báo cáo. */
  exportReport: (
    payload: ExportReportPayload,
    options?: RequestOptions,
  ): Promise<Blob> =>
    apiClient.post<any, Blob>('/reports/export', payload, {
      signal: options?.signal,
      responseType: 'blob',
    }),

  getSaved: (
    params?: { page?: number; pageSize?: number; search?: string },
    options?: RequestOptions,
  ) =>
    apiClient.get<any, PaginatedResponse<SavedReport>>('/reports', {
      params,
      signal: options?.signal,
    }),

  createSaved: (
    data: { name: string; reportType: string; filters?: Record<string, unknown> },
    options?: RequestOptions,
  ) =>
    apiClient.post<any, { data: SavedReport }>('/reports', data, {
      signal: options?.signal,
    }),

  removeSaved: (id: string, options?: RequestOptions) =>
    apiClient.delete<any, { data: { deleted: boolean } }>(`/reports/${id}`, {
      signal: options?.signal,
    }),
};

export function reportTypeLabel(reportType: ReportType): string {
  const labels: Record<ReportType, string> = {
    revenue: 'Doanh thu',
    'sales-performance': 'Hiệu suất Sales',
    customer: 'Khách hàng',
    supplier: 'Nhà cung cấp',
  };
  return labels[reportType];
}
