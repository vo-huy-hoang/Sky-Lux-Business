export interface DossierCommentUser {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

export interface DossierComment {
  id: string;
  organizationId: string;
  dossierId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: DossierCommentUser;
}

export interface DossierCommentsMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DossierCommentsResponse {
  data: DossierComment[];
  meta: DossierCommentsMeta;
}

export interface CreateCommentPayload {
  content: string;
  parentId?: string;
}

export interface QueryCommentParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface DossierItem {
  id: string;
  code: string;
  name: string;
  customerId: string;
  businessLineId?: string;
  marketTypeId?: string;
  businessLine?: {
    id: string;
    code: string;
    name: string;
  };
  marketType?: {
    id: string;
    code: string;
    name: string;
  };
  salesUserId?: string;
  operatorUserId?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  priority?: string;
  customer?: {
    id: string;
    code: string;
    displayName: string;
    taxCode?: string;
  };
  salesUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  operatorUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  estimates?: Array<{
    id?: string;
    totalRevenue?: number;
    totalCost?: number;
    netProfit?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface QueryDossierParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  salesUserId?: string;
}

export interface PaginatedDossiersResponse {
  data: DossierItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
