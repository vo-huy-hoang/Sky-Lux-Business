import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { DossierItem, QueryDossierParams } from '@/types/dossier';

/**
 * Hook lấy danh sách hồ sơ phân trang và tìm kiếm
 */
export function useDossiersList(params?: QueryDossierParams) {
  return useQuery({
    queryKey: ['dossiers-list', params],
    queryFn: () => dossiersService.getDossiers(params),
  });
}

/**
 * Hook lấy chi tiết hồ sơ tour theo ID
 */
export function useDossierDetail(id: string) {
  return useQuery({
    queryKey: ['dossier-detail', id],
    queryFn: () => dossiersService.getDossier(id),
    enabled: !!id,
  });
}

/**
 * Hook cập nhật thông tin/metadata của hồ sơ tour
 */
export function useUpdateDossierMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DossierItem> }) =>
      dossiersService.updateDossier(id, data),
    onSuccess: (data) => {
      // Invalidate chi tiết hồ sơ
      queryClient.invalidateQueries({ queryKey: ['dossier-detail', data.id] });
      // Invalidate danh sách hồ sơ
      queryClient.invalidateQueries({ queryKey: ['dossiers-list'] });
    },
  });
}
