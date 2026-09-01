export enum EstimateStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  NEED_CHANGES = 'NEED_CHANGES',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
  REJECTED = 'REJECTED',
}

export interface EstimateRevenueLine {
  id: string;
  organizationId: string;
  estimateId: string;
  passengerTypeId?: string;
  description: string;
  quantity: number;
  unitId?: string;
  multiplier: number;
  unitPrice: number;
  vatRate: number;
  grossAmount: number;
  netAmount: number;
  note?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  unit?: { id?: string; code?: string; name?: string };
  passengerType?: { id?: string; code?: string; name?: string };
}

export interface EstimateCostLine {
  id: string;
  organizationId: string;
  estimateId: string;
  serviceCategoryId?: string;
  supplierId?: string;
  description: string;
  quantity: number;
  unitId?: string;
  multiplier: number;
  unitPrice: number;
  vatRate: number;
  grossAmount: number;
  netAmount: number;
  note?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  unit?: { id?: string; code?: string; name?: string };
  serviceCategory?: { id?: string; code?: string; name?: string };
  supplier?: { id?: string; code?: string; name?: string; displayName?: string };
}

export interface EstimateItem {
  id: string;
  organizationId: string;
  dossierId: string;
  versionNo: number;
  status: EstimateStatus;
  sourceImportSessionId?: string;
  parentEstimateId?: string;
  currency: string;
  note?: string;
  createdBy?: string;
  submittedBy?: string;
  approvedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  revenueLines?: EstimateRevenueLine[];
  costLines?: EstimateCostLine[];
  totalRevenue?: number;
  totalCost?: number;
  totalProfit?: number;
  dossier?: {

    id: string;
    code?: string;
    name?: string;
    route?: string;
    customer?: { id: string; code?: string; displayName?: string };
  };
}


export interface PaginatedEstimatesResponse {
  items: EstimateItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
