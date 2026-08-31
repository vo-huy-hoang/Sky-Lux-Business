import { apiClient } from '@/lib/api-client';
import {
  DossierItem,
  DossierComment,
  DossierCommentsResponse,
  QueryDossierParams,
  CreateCommentPayload,
  QueryCommentParams,
} from '@/types/dossier';

export const dossiersService = {
  /**
   * API-DOSSIER-001: Lấy danh sách hồ sơ phân trang và tìm kiếm
   */
  getDossiers: (params?: QueryDossierParams) => {
    return apiClient.get<
      any,
      { items: DossierItem[]; total: number; page: number; limit: number; totalPages: number }
    >('/dossiers', { params });
  },

  /**
   * API-DOSSIER-002: Lấy chi tiết hồ sơ theo ID
   */
  getDossier: (id: string) => {
    return apiClient.get<any, DossierItem>(`/dossiers/${id}`);
  },

  /**
   * API-DOSSIER-003: Cập nhật metadata hồ sơ
   */
  updateDossier: (id: string, data: Partial<DossierItem>) => {
    return apiClient.patch<any, DossierItem>(`/dossiers/${id}`, data);
  },

  /**
   * API-COMMENT-001: Lấy danh sách bình luận của hồ sơ tour
   */
  getDossierComments: (dossierId: string, params?: QueryCommentParams) => {
    return apiClient.get<any, DossierCommentsResponse>(
      `/dossiers/${dossierId}/comments`,
      { params },
    );
  },

  /**
   * API-COMMENT-002: Tạo bình luận cho hồ sơ tour
   */
  createDossierComment: (dossierId: string, payload: CreateCommentPayload) => {
    return apiClient.post<any, DossierComment>(`/dossiers/${dossierId}/comments`, payload);
  },
};
