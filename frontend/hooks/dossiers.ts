import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import {
  DossierItem,
  QueryDossierParams,
  CreateCommentPayload,
  QueryCommentParams,
} from '@/types/dossier';

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

/**
 * Hook lấy danh sách bình luận của hồ sơ tour (API-COMMENT-001)
 */
export function useDossierComments(dossierId: string, params?: QueryCommentParams) {
  return useQuery({
    queryKey: ['dossier-comments', dossierId, params],
    queryFn: () => dossiersService.getDossierComments(dossierId, params),
    enabled: !!dossierId,
  });
}

/**
 * Hook tạo bình luận cho hồ sơ tour (API-COMMENT-002)
 */
export function useCreateDossierComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dossierId,
      payload,
    }: {
      dossierId: string;
      payload: CreateCommentPayload;
    }) => dossiersService.createDossierComment(dossierId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['dossier-comments', variables.dossierId],
      });
    },
  });
}
