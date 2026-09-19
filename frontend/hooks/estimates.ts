import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesService } from '@/services/estimates.service';
import { queryKeys } from '@/lib/query-keys';
import { EstimateItem, PaginatedEstimatesResponse } from '@/types/estimate';

/**
 * Hook lấy danh sách báo giá của dossier
 */
export function useDossierEstimates(dossierId: string, options?: { enabled?: boolean }) {
  return useQuery<PaginatedEstimatesResponse>({
    queryKey: queryKeys.estimates.dossierList(dossierId),
    queryFn: ({ signal }) => estimatesService.getDossierEstimates(dossierId, { signal }),
    ...options,
    enabled: Boolean(dossierId) && (options?.enabled ?? true),
  });
}

/**
 * Hook lấy thông tin chi tiết một báo giá
 */
export function useEstimateDetail(id?: string | null, options?: { enabled?: boolean }) {
  return useQuery<EstimateItem>({
    queryKey: queryKeys.estimates.detail(id || undefined),
    queryFn: ({ signal }) => estimatesService.getEstimate(id!, { signal }),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * Hook cập nhật thông tin/trạng thái báo giá
 */
export function useUpdateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EstimateItem> }) =>
      estimatesService.updateEstimate(id, data),
    onSuccess: (data) => {
      // Invalidate chi tiết báo giá
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.detail(data.id) });
      // Invalidate danh sách báo giá của hồ sơ
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.dossierList(data.dossierId) });
      // Invalidate toàn bộ dashboards
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
    },
  });
}

