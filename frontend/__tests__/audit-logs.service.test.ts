import { apiClient } from '@/lib/api-client';
import { auditLogsService } from '@/services/audit-logs.service';
import { QueryAuditLogParams } from '@/types/audit-log';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('AuditLogsService (Frontend)', () => {
  const logId = 'audit-log-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuditLogItem = {
    id: logId,
    organizationId: 'org-uuid',
    actorUserId: 'user-uuid',
    action: 'CREATE_DOSSIER',
    entityType: 'dossier',
    entityId: 'dossier-uuid-1',
    beforeData: null,
    afterData: { code: 'HS001' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    requestId: 'req-uuid-1',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    actor: {
      id: 'user-uuid',
      fullName: 'Admin User',
      email: 'admin@skylux.vn',
    },
  };

  it('API-AUDIT-001: getAuditLogs calls GET /audit-logs without params', async () => {
    const mockResponse = {
      data: [mockAuditLogItem],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await auditLogsService.getAuditLogs();

    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', {
      params: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-AUDIT-001: getAuditLogs calls GET /audit-logs with query params', async () => {
    const mockResponse = {
      data: [mockAuditLogItem],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const params: QueryAuditLogParams = {
      page: 1,
      pageSize: 10,
      action: 'CREATE_DOSSIER',
      entityType: 'dossier',
      search: 'HS001',
    };
    const result = await auditLogsService.getAuditLogs(params);

    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', { params });
    expect(result).toEqual(mockResponse);
  });

  it('API-AUDIT-002: getAuditLog calls GET /audit-logs/:id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockAuditLogItem);

    const result = await auditLogsService.getAuditLog(logId);

    expect(apiClient.get).toHaveBeenCalledWith(`/audit-logs/${logId}`);
    expect(result).toEqual(mockAuditLogItem);
  });
});
