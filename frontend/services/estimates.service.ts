import { apiClient } from '@/lib/api-client';
import { EstimateItem, EstimateStatus, PaginatedEstimatesResponse } from '@/types/estimate';

export const estimatesService = {
  /**
   * API-ESTIMATE-001: Lấy danh sách báo giá/dự toán của hồ sơ vụ việc
   */
  getDossierEstimates: (dossierId: string) => {
    return apiClient.get<any, PaginatedEstimatesResponse>('/estimates', {
      params: { dossierId, page: 1, limit: 100 },
    });
  },

  getEstimates: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    dossierId?: string;
    status?: EstimateStatus;
  }) => apiClient.get<any, PaginatedEstimatesResponse>('/estimates', { params }),

  /**
   * API-ESTIMATE-002: Lấy chi tiết một báo giá/dự toán
   */
  getEstimate: (id: string) => {
    return apiClient.get<any, EstimateItem>(`/estimates/${id}`);
  },

  /**
   * API-ESTIMATE-003: Cập nhật thông tin/trạng thái báo giá
   */
  updateEstimate: (id: string, data: Partial<EstimateItem>) => {
    return apiClient.patch<any, EstimateItem>(`/estimates/${id}`, data);
  },
};
