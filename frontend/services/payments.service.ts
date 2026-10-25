import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  FinanceSummaryResponse,
  PaginatedPaymentsResponse,
  PaymentItem,
  CreatePaymentInput,
  UpdatePaymentInput,
} from '@/types/payment';

export const paymentsService = {
  getPaymentsByDossier: (dossierId: string, options?: RequestOptions) =>
    apiClient.get<any, PaginatedPaymentsResponse>(`/dossiers/${dossierId}/payments`, {
      signal: options?.signal,
    }),

  getFinanceSummary: (dossierId: string, options?: RequestOptions) =>
    apiClient.get<any, FinanceSummaryResponse>(`/dossiers/${dossierId}/finance-summary`, {
      signal: options?.signal,
    }),

  getPaymentDetail: (id: string, options?: RequestOptions) =>
    apiClient.get<any, { data: PaymentItem }>(`/payments/${id}`, {
      signal: options?.signal,
    }),

  createPayment: (dossierId: string, data: CreatePaymentInput) =>
    apiClient.post<any, { data: PaymentItem }>(`/dossiers/${dossierId}/payments`, data),

  updatePayment: (id: string, data: UpdatePaymentInput) =>
    apiClient.patch<any, { data: PaymentItem }>(`/payments/${id}`, data),
};
