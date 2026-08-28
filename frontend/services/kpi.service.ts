import { apiClient } from '@/lib/api-client';

export interface MyKpiItem {
  target: {
    metricCode: string;
    targetValue: number;
  };
  actualValue: number;
  achievementRate: number;
}

export const kpiService = {
  getMyKpi: (params?: { periodType?: string; date?: string }) =>
    apiClient.get<any, MyKpiItem[]>('/kpis/me', { params }),
};
