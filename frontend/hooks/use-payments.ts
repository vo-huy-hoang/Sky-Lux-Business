import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '@/services/payments.service';
import { queryKeys } from '@/lib/query-keys';

export function useDossierPayments(dossierId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.payments.dossierPayments(dossierId || ''),
    queryFn: ({ signal }) => paymentsService.getPaymentsByDossier(dossierId!, { signal }),
    ...options,
    enabled: Boolean(dossierId) && (options?.enabled ?? true),
  });
}

export function useDossierFinanceSummary(dossierId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.financeSummary(dossierId || ''),
    queryFn: ({ signal }) => paymentsService.getFinanceSummary(dossierId!, { signal }),
    enabled: !!dossierId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}
