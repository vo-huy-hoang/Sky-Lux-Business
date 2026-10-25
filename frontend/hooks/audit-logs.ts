import { useQuery } from '@tanstack/react-query';
import { auditLogsService } from '@/services/audit-logs.service';
import { QueryAuditLogParams } from '@/types/audit-log';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook lấy danh sách nhật ký kiểm toán (API-AUDIT-001)
 */
export function useAuditLogs(params?: QueryAuditLogParams) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(params),
    queryFn: ({ signal }) => auditLogsService.getAuditLogs(params, { signal }),
  });
}

/**
 * Hook lấy chi tiết nhật ký kiểm toán theo ID (API-AUDIT-002)
 */
export function useAuditLogDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.auditLogs.detail(id),
    queryFn: ({ signal }) => auditLogsService.getAuditLog(id, { signal }),
    enabled: !!id,
  });
}


