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
  /** IDs of legacy customer rows grouped by phone/email identity. */
  customerIds?: string[];
  /** Number of dossiers across the grouped customer rows. */
  dossierCount?: number;
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

export type CustomerActivityType =
  | 'CALL'
  | 'QUOTE_SENT'
  | 'CUSTOMER_RESPONSE'
  | 'BROCHURE_SENT'
  | 'NOTE'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_DELETED'
  | 'DOSSIER_CREATED'
  | 'DOSSIER_UPDATED';

export interface CustomerActivityActor {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

export interface CustomerActivityItem {
  id: string;
  customerId: string;
  type: CustomerActivityType | string;
  title: string;
  description?: string;
  occurredAt: string;
  actorUserId?: string;
  actor?: CustomerActivityActor;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface QueryCustomerActivityParams {
  page?: number;
  limit?: number;
  type?: CustomerActivityType;
  from?: string;
  to?: string;
}

export interface PaginatedCustomerActivitiesResponse {
  data: CustomerActivityItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
