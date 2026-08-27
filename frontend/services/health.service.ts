import { apiClient } from '@/lib/api-client';
import { HealthCheckResponse } from '@/types/health';

export const healthService = {
  /**
   * API-HEALTH-001: Lấy trạng thái sức khỏe hệ thống (Database, Memory)
   */
  getSystemHealth: () => {
    return apiClient.get<any, HealthCheckResponse>('/health');
  },
};
