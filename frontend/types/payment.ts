export interface PaymentItem {
  id: string;
  organizationId: string;
  dossierId: string;
  amount: number;
  paidAt: string;
  method: string;
  referenceCode?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
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
  referenceCode?: string;
  note?: string;
}

export interface UpdatePaymentInput {
  amount?: number;
  paidAt?: string;
  method?: string;
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
