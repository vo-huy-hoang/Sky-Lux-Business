export interface PaymentItem {
  id: string;
  organizationId: string;
  dossierId: string;
  amount: number;
  paidAt: string;
  method: string;
  paymentDate?: string;
  paymentMethod?: string;
  paymentDirection?: 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT';
  status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate?: string;
  documentId?: string;
  referenceCode?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PaginatedPaymentsResponse {
  data: PaymentItem[];
  meta: {
    total: number;
  };
}

export interface CreatePaymentInput {
  amount: number;
  paidAt?: string;
  method?: string;
  paymentDirection?: 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT';
  referenceCode?: string;
  note?: string;
}

export interface UpdatePaymentInput {
  amount?: number;
  paidAt?: string;
  method?: string;
  paymentDirection?: 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT';
  referenceCode?: string;
  note?: string;
}

export interface FinanceSummaryResponse {
  data: {
    dossierId: string;
    totalCost: number;
    totalPaid: number;
    remainingDebt: number;
    lastCalculatedAt: string;
  };
  meta: any;
}
