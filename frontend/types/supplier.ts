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
  supplierTypeId?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  code: string;
  name: string;
  supplierTypeId?: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  status?: SupplierStatus;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

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
