import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesService } from '@/services/estimates.service';
import { queryKeys } from '@/lib/query-keys';
import { EstimateItem } from '@/types/estimate';

/**
 * Hook lấy danh sách báo giá của dossier
 */
export function useDossierEstimates(dossierId: string) {
  return useQuery({
    queryKey: queryKeys.estimates.dossierList(dossierId),
    queryFn: () => estimatesService.getDossierEstimates(dossierId),
    enabled: !!dossierId,
  });
}

/**
 * Hook lấy thông tin chi tiết một báo giá
 */
export function useEstimateDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.estimates.detail(id),
    queryFn: () => estimatesService.getEstimate(id),
    enabled: !!id,
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

