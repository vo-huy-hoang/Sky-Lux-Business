import { apiClient } from '@/lib/api-client';
import {
  AuditLogItem,
  QueryAuditLogParams,
  PaginatedAuditLogResponse,
} from '@/types/audit-log';

export const auditLogsService = {
  /**
   * API-AUDIT-001: Lấy danh sách nhật ký kiểm toán phân trang và lọc
   */
  getAuditLogs: (params?: QueryAuditLogParams) => {
    return apiClient.get<any, PaginatedAuditLogResponse>('/audit-logs', {
      params,
    });
  },

  /**
   * API-AUDIT-002: Lấy chi tiết nhật ký kiểm toán theo ID
   */
  getAuditLog: (id: string) => {
    return apiClient.get<any, AuditLogItem>(`/audit-logs/${id}`);
  },
};
