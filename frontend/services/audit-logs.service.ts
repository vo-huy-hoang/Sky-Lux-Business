import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  AuditLogItem,
  QueryAuditLogParams,
  PaginatedAuditLogResponse,
} from '@/types/audit-log';

export const auditLogsService = {
  /**
   * API-AUDIT-001: Lấy danh sách nhật ký kiểm toán phân trang và lọc
   */
  getAuditLogs: (params?: QueryAuditLogParams, options?: RequestOptions) => {
    return apiClient.get<any, PaginatedAuditLogResponse>('/audit-logs', {
      params,
      signal: options?.signal,
    });
  },

  /**
   * API-AUDIT-002: Lấy chi tiết nhật ký kiểm toán theo ID
   */
  getAuditLog: (id: string, options?: RequestOptions) => {
    return options?.signal
      ? apiClient.get<any, AuditLogItem>(`/audit-logs/${id}`, { signal: options.signal })
      : apiClient.get<any, AuditLogItem>(`/audit-logs/${id}`);
  },


};

