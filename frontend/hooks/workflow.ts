import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '@/services/workflow.service';
import { queryKeys } from '@/lib/query-keys';
import {
  WorkflowActionInput,
  WorkflowActionResult,
  QueryWorkflowParams,
} from '@/types/workflow';

export const workflowKeys = {
  all: ['workflow'] as const,
  history: (dossierId: string, params?: QueryWorkflowParams) =>
    queryKeys.approvals.history(dossierId, params),
  approvals: (dossierId: string, params?: QueryWorkflowParams) =>
    queryKeys.approvals.approvalsList(dossierId, params),
};

/**
 * API-WORKFLOW-008: Hook lấy lịch sử workflow
 */
export function useWorkflowHistory(
  dossierId: string,
  params?: QueryWorkflowParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.approvals.history(dossierId, params),
    queryFn: ({ signal }) =>
      workflowService.getWorkflowHistory(dossierId, params, { signal }),
    enabled: Boolean(dossierId) && (options?.enabled ?? true),
  });
}

/**
 * API-WORKFLOW-009: Hook lấy danh sách approval của hồ sơ
 */
export function useApprovals(
  dossierId: string,
  params?: QueryWorkflowParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.approvals.approvalsList(dossierId, params),
    queryFn: ({ signal }) =>
      workflowService.getApprovals(dossierId, params, { signal }),
    enabled: Boolean(dossierId) && (options?.enabled ?? true),
  });
}


interface WorkflowMutationVariables {
  dossierId: string;
  data?: WorkflowActionInput;
}

const useWorkflowMutation = (
  mutationFn: (variables: WorkflowMutationVariables) => Promise<WorkflowActionResult>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_, variables) => {
      const { dossierId } = variables;
      queryClient.invalidateQueries({ queryKey: queryKeys.dossiers.detail(dossierId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dossiers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
    },
  });
};


/**
 * API-WORKFLOW-001: Submit hồ sơ để Điều hành xem xét
 */
export function useSubmitDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.submit(dossierId, data),
  );
}

/**
 * API-WORKFLOW-002: Bắt đầu review hồ sơ
 */
export function useStartReviewDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.startReview(dossierId, data),
  );
}

export function useReturnToOperationsDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.returnToOperations(dossierId, data),
  );
}

/**
 * API-WORKFLOW-003: Yêu cầu Sales bổ sung hồ sơ
 */
export function useRequestChangesDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.requestChanges(dossierId, data),
  );
}

/**
 * API-WORKFLOW-004: Sales submit lại hồ sơ đã bổ sung
 */
export function useResubmitDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.resubmit(dossierId, data),
  );
}

/**
 * API-WORKFLOW-005: Phê duyệt hồ sơ
 */
export function useApproveDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.approve(dossierId, data),
  );
}

/**
 * API-WORKFLOW-006: Hoàn tất hồ sơ đã duyệt
 */
export function useCompleteDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.complete(dossierId, data),
  );
}

/**
 * API-WORKFLOW-007: Khóa hồ sơ đã duyệt/hoàn tất
 */
export function useLockDossier() {
  return useWorkflowMutation(({ dossierId, data }) =>
    workflowService.lock(dossierId, data),
  );
}
