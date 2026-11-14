export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface SupplierType {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  sortOrder: number;
}

export interface SupplierItem {
  id: string;
  organizationId: string;
  supplierTypeId?: string | null;
  supplierTypeName?: string;
  supplierType?: SupplierType;
  code: string;
  name: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  status: SupplierStatus;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  code: string;
  name: string;
  supplierTypeId?: string;
  supplierTypeName?: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  status?: SupplierStatus;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface BatchCreateSuppliersInput {
  suppliers: CreateSupplierInput[];
}

export interface BatchCreateSuppliersResponse {
  total: number;
  imported: number;
  items?: SupplierItem[];
}

export interface QuerySupplierParams {
  page?: number;
  limit?: number;
  pageSize?: number;
  search?: string;
  status?: SupplierStatus | string;
  supplierTypeId?: string;
}

export interface PaginatedSuppliersResponse {
  data: SupplierItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SupplierDossierHistoryItem {
  dossierId: string;
  dossierCode: string;
  dossierTitle: string;
  departureDate?: string;
  status: string;
  operatorOrSalesName?: string;
  lineCount: number;
  totalCost: number;
}

export interface QuerySupplierDossiersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  completedOnly?: boolean;
}

export interface PaginatedSupplierDossiersResponse {
  data: SupplierDossierHistoryItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
