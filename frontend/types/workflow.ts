export interface WorkflowActionInput {
  note?: string;
  customerId?: string;
  operatorUserId?: string;
  businessLineId?: string;
  marketTypeId?: string;
}

export interface WorkflowHistoryActor {
  id: string;
  fullName: string;
}

export interface WorkflowHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  comment?: string;
  createdAt: string;
  actor?: WorkflowHistoryActor;
}

export interface ApprovalReviewer {
  id: string;
  fullName: string;
}

export interface ApprovalRequestItem {
  id: string;
  estimateId?: string;
  stepNo: number;
  stepCode: string;
  status: string;
  requestedAt: string;
  decidedAt?: string;
  comment?: string;
  reviewer?: ApprovalReviewer;
}

export interface QueryWorkflowParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface WorkflowPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WorkflowHistoryResponse {
  data: WorkflowHistoryItem[];
  meta: WorkflowPaginationMeta;
}

export interface ApprovalsResponse {
  data: ApprovalRequestItem[];
  meta: WorkflowPaginationMeta;
}

export interface WorkflowActionResult {
  data: {
    id: string;
    code: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  meta: Record<string, unknown>;
}
