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
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  user?: DossierCommentUser;
}

export interface DossierItem {
  id: string;
  code: string;
  name: string;
  customerId: string;
  businessLineId?: string;
  marketTypeId?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface QueryDossierParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
}
