export interface CustomerContact {
  id?: string;
  customerId?: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';

export interface CustomerItem {
  id: string;
  organizationId: string;
  code: string;
  customerType: CustomerType;
  displayName: string;
  taxCode?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  status: string;
  assignedSalesId?: string;
  assignedSales?: {
    id: string;
    fullName: string;
    email: string;
  };
  contacts?: CustomerContact[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactInput {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export type UpdateContactInput = Partial<CreateContactInput>;

export interface QueryCustomerParams {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: CustomerType;
  status?: string;
}

export interface PaginatedCustomersResponse {
  data: CustomerItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
