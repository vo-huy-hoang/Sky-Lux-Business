import { apiClient, RequestOptions } from '@/lib/api-client';
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
  getSaved: (params?: { page?: number; pageSize?: number; search?: string }, options?: RequestOptions) =>
    apiClient.get<any, PaginatedResponse<SavedReport>>('/reports', {
      params,
      signal: options?.signal,
    }),

  createSaved: (
    data: { name: string; reportType: string; filters?: Record<string, unknown> },
    options?: RequestOptions,
  ) => apiClient.post<any, { data: SavedReport }>('/reports', data, { signal: options?.signal }),

  removeSaved: (id: string, options?: RequestOptions) =>
    apiClient.delete<any, { data: { deleted: boolean } }>(`/reports/${id}`, {
      signal: options?.signal,
    }),
};
