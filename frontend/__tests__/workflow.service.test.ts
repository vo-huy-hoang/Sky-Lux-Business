import { apiClient } from '@/lib/api-client';
import { workflowService } from '@/services/workflow.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('WorkflowService (Frontend)', () => {
  const dossierId = 'dossier-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockActionResult = {
    data: {
      id: dossierId,
      code: 'DOS-2026-001',
      status: 'SUBMITTED',
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
    },
    meta: {},
  };

  it('API-WORKFLOW-001: submit calls POST /dossiers/:id/submit', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Submit for review' };
    const result = await workflowService.submit(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/submit`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-002: startReview calls POST /dossiers/:id/start-review', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Review started' };
    const result = await workflowService.startReview(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/start-review`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-003: requestChanges calls POST /dossiers/:id/request-changes', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Needs hotel change' };
    const result = await workflowService.requestChanges(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/request-changes`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-004: resubmit calls POST /dossiers/:id/resubmit', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Resubmitted with new pricing' };
    const result = await workflowService.resubmit(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/resubmit`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-005: approve calls POST /dossiers/:id/approve', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Approved' };
    const result = await workflowService.approve(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/approve`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-006: complete calls POST /dossiers/:id/complete', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Completed' };
    const result = await workflowService.complete(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/complete`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-007: lock calls POST /dossiers/:id/lock', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockActionResult);

    const payload = { note: 'Locked' };
    const result = await workflowService.lock(dossierId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/lock`,
      payload,
    );
    expect(result).toEqual(mockActionResult);
  });

  it('API-WORKFLOW-008: getWorkflowHistory calls GET /dossiers/:id/workflow-history', async () => {
    const mockHistoryResponse = {
      data: [
        {
          id: 'hist-1',
          fromStatus: 'DRAFT',
          toStatus: 'SUBMITTED',
          action: 'SUBMIT',
          comment: 'Initial submit',
          createdAt: '2026-08-24T00:00:00.000Z',
          actor: { id: 'user-1', fullName: 'Nguyen Van A' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockHistoryResponse);

    const params = { page: 1, pageSize: 20 };
    const result = await workflowService.getWorkflowHistory(dossierId, params);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/workflow-history`,
      { params },
    );
    expect(result).toEqual(mockHistoryResponse);
  });

  it('API-WORKFLOW-009: getApprovals calls GET /dossiers/:id/approvals', async () => {
    const mockApprovalsResponse = {
      data: [
        {
          id: 'appr-1',
          stepNo: 1,
          stepCode: 'LEADER_REVIEW',
          status: 'PENDING',
          requestedAt: '2026-08-24T00:00:00.000Z',
          reviewer: { id: 'user-2', fullName: 'Tran Thi B' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockApprovalsResponse);

    const params = { page: 1, pageSize: 20, status: 'PENDING' };
    const result = await workflowService.getApprovals(dossierId, params);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/approvals`,
      { params },
    );
    expect(result).toEqual(mockApprovalsResponse);
  });
});
