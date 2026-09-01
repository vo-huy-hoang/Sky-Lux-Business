import { useQuery } from '@tanstack/react-query';
import { auditLogsService } from '@/services/audit-logs.service';
import { QueryAuditLogParams } from '@/types/audit-log';

/**
 * Hook lấy danh sách nhật ký kiểm toán (API-AUDIT-001)
 */
export function useAuditLogs(params?: QueryAuditLogParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogsService.getAuditLogs(params),
  });
}

/**
 * Hook lấy chi tiết nhật ký kiểm toán theo ID (API-AUDIT-002)
 */
export function useAuditLogDetail(id: string) {
  return useQuery({
    queryKey: ['audit-log-detail', id],
    queryFn: () => auditLogsService.getAuditLog(id),
    enabled: !!id,
  });
}
