import { apiClient, RequestOptions } from '@/lib/api-client';
import { EstimateItem, EstimateStatus, PaginatedEstimatesResponse } from '@/types/estimate';

export const estimatesService = {
  /**
   * API-ESTIMATE-001: Lấy danh sách báo giá/dự toán của hồ sơ vụ việc
   */
  getDossierEstimates: (dossierId: string, options?: RequestOptions) => {
    return apiClient.get<any, PaginatedEstimatesResponse>('/estimates', {
      params: { dossierId, page: 1, limit: 100 },
      signal: options?.signal,
    });
  },

  getEstimates: (
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      dossierId?: string;
      status?: EstimateStatus;
    },
    options?: RequestOptions,
  ) =>
    apiClient.get<any, PaginatedEstimatesResponse>('/estimates', {
      params,
      signal: options?.signal,
    }),

  /**
   * API-ESTIMATE-002: Lấy chi tiết một báo giá/dự toán
   */
  getEstimate: (id: string, options?: RequestOptions) => {
    return apiClient.get<any, EstimateItem>(`/estimates/${id}`, {
      signal: options?.signal,
    });
  },

  /**
   * API-ESTIMATE-003: Cập nhật thông tin/trạng thái báo giá
   */
  updateEstimate: (id: string, data: Partial<EstimateItem>) => {
    return apiClient.patch<any, EstimateItem>(`/estimates/${id}`, data);
  },
};
