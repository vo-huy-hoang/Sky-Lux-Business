import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesService } from '@/services/estimates.service';
import { EstimateItem } from '@/types/estimate';

/**
 * Hook lấy danh sách báo giá của dossier
 */
export function useDossierEstimates(dossierId: string) {
  return useQuery({
    queryKey: ['dossier-estimates', dossierId],
    queryFn: () => estimatesService.getDossierEstimates(dossierId),
    enabled: !!dossierId,
  });
}

/**
 * Hook lấy thông tin chi tiết một báo giá
 */
export function useEstimateDetail(id: string) {
  return useQuery({
    queryKey: ['estimate', id],
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
      queryClient.invalidateQueries({ queryKey: ['estimate', data.id] });
      // Invalidate danh sách báo giá của hồ sơ
      queryClient.invalidateQueries({ queryKey: ['dossier-estimates', data.dossierId] });
    },
  });
}
