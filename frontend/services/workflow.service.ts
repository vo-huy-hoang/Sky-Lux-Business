import { apiClient, RequestOptions } from '@/lib/api-client';

import {
  WorkflowActionInput,
  WorkflowActionResult,
  WorkflowHistoryResponse,
  ApprovalsResponse,
  QueryWorkflowParams,
} from '@/types/workflow';

const executeWorkflowAction = (
  dossierId: string,
  action: string,
  data?: WorkflowActionInput,
) => {
  return apiClient.post<unknown, WorkflowActionResult>(
    `/dossiers/${dossierId}/${action}`,
    data || {},
  );
};

export const workflowService = {
  /**
   * API-WORKFLOW-001: Submit hồ sơ để Điều hành xem xét
   */
  submit: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'submit', data),

  /**
   * API-WORKFLOW-002: Bắt đầu review hồ sơ
   */
  startReview: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'start-review', data),

  /** Return a dossier under review to the operator queue. */
  returnToOperations: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'return-to-operations', data),

  /**
   * API-WORKFLOW-003: Yêu cầu Sales bổ sung hồ sơ
   */
  requestChanges: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'request-changes', data),

  /**
   * API-WORKFLOW-004: Sales submit lại hồ sơ đã bổ sung
   */
  resubmit: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'resubmit', data),

  /**
   * API-WORKFLOW-005: Phê duyệt hồ sơ
   */
  approve: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'approve', data),

  /**
   * API-WORKFLOW-006: Hoàn tất hồ sơ đã duyệt
   */
  complete: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'complete', data),

  /**
   * API-WORKFLOW-007: Khóa hồ sơ đã duyệt/hoàn tất
   */
  lock: (dossierId: string, data?: WorkflowActionInput) =>
    executeWorkflowAction(dossierId, 'lock', data),

  /**
   * API-WORKFLOW-008: Lấy lịch sử workflow
   */
  getWorkflowHistory: (
    dossierId: string,
    params?: QueryWorkflowParams,
    options?: RequestOptions,
  ) => {
    return apiClient.get<unknown, WorkflowHistoryResponse>(
      `/dossiers/${dossierId}/workflow-history`,
      { params, signal: options?.signal },
    );
  },

  /**
   * API-WORKFLOW-009: Lấy danh sách approval của hồ sơ
   */
  getApprovals: (
    dossierId: string,
    params?: QueryWorkflowParams,
    options?: RequestOptions,
  ) => {
    return apiClient.get<unknown, ApprovalsResponse>(
      `/dossiers/${dossierId}/approvals`,
      { params, signal: options?.signal },
    );
  },
};
