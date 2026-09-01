export interface AuditLogActor {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

export interface AuditLogItem {
  id: string;
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: string;
  updatedAt: string;
  actor?: AuditLogActor;
}

export interface QueryAuditLogParams {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface AuditLogPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedAuditLogResponse {
  data: AuditLogItem[];
  meta: AuditLogPaginationMeta;
}
