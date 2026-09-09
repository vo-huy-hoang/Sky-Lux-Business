import { apiClient } from '@/lib/api-client';
import {
  PaginatedKpisResponse,
  QueryKpisDto,
  CreateKpiTargetDto,
  UpdateKpiTargetDto,
  KpiTarget,
  KpisMeResponse,
  KpiAssignee,
} from '@/types/kpi';

export const kpisService = {
  getKpiMe: (params?: QueryKpisDto, options?: any) =>
    apiClient.get<any, KpisMeResponse>('/kpis/me', {
      params,
      signal: options?.signal,
    }),

  getAllKpis: (params?: QueryKpisDto, options?: any) =>
    apiClient.get<any, PaginatedKpisResponse>('/kpis', {
      params,
      signal: options?.signal,
    }),

  getSalesKpis: (params?: QueryKpisDto, options?: any) =>
    apiClient.get<any, PaginatedKpisResponse>('/kpis/sales', {
      params,
      signal: options?.signal,
    }),

  createKpiTarget: (data: CreateKpiTargetDto) =>
    apiClient.post<any, { data: KpiTarget }>('/kpis/targets', data),

  updateKpiTarget: (id: string, data: UpdateKpiTargetDto) =>
    apiClient.patch<any, { data: KpiTarget }>(`/kpis/targets/${id}`, data),

  getAssignableUsers: () =>
    apiClient.get<any, { data: KpiAssignee[]; meta: { total: number } }>(
      '/kpis/assignees',
    ),
};
