import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuditLogs, useAuditLogDetail } from '@/hooks/audit-logs';
import { auditLogsService } from '@/services/audit-logs.service';

jest.mock('@/services/audit-logs.service', () => ({
  auditLogsService: {
    getAuditLogs: jest.fn(),
    getAuditLog: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useAuditLogs hooks', () => {
  const logId = 'audit-log-uuid-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuditLog = {
    id: logId,
    organizationId: 'org-uuid',
    actorUserId: 'user-uuid',
    action: 'UPDATE_ROLE',
    entityType: 'role',
    entityId: 'role-uuid-1',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  };

  it('useAuditLogs fetches audit logs list (API-AUDIT-001)', async () => {
    const mockResponse = {
      data: [mockAuditLog],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    (auditLogsService.getAuditLogs as jest.Mock).mockResolvedValueOnce(
      mockResponse,
    );

    const { Wrapper } = createWrapper();
    const params = { page: 1, pageSize: 20 };
    const { result } = renderHook(() => useAuditLogs(params), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse);
    expect(auditLogsService.getAuditLogs).toHaveBeenCalledWith(params, {
      signal: expect.anything(),
    });
  });

  it('useAuditLogDetail fetches audit log detail (API-AUDIT-002)', async () => {
    (auditLogsService.getAuditLog as jest.Mock).mockResolvedValueOnce(
      mockAuditLog,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAuditLogDetail(logId), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAuditLog);
    expect(auditLogsService.getAuditLog).toHaveBeenCalledWith(logId, {
      signal: expect.anything(),
    });
  });
});

