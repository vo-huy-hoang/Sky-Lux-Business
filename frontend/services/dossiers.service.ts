import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  DossierItem,
  DossierComment,
  DossierCommentsResponse,
  PaginatedDossiersResponse,
  QueryDossierParams,
  CreateCommentPayload,
  QueryCommentParams,
} from '@/types/dossier';

export const dossiersService = {
  /**
   * API-DOSSIER-001: Lấy danh sách hồ sơ phân trang và tìm kiếm
   */
  getDossiers: (params?: QueryDossierParams, options?: RequestOptions) => {
    return apiClient.get<any, PaginatedDossiersResponse>('/dossiers', {
      params,
      signal: options?.signal,
    });
  },

  /**
   * API-DOSSIER-002: Lấy chi tiết hồ sơ theo ID
   */
  getDossier: (id: string, options?: RequestOptions) => {
    return options?.signal
      ? apiClient.get<any, DossierItem>(`/dossiers/${id}`, { signal: options.signal })
      : apiClient.get<any, DossierItem>(`/dossiers/${id}`);
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
  getDossierComments: (dossierId: string, params?: QueryCommentParams, options?: RequestOptions) => {
    return apiClient.get<any, DossierCommentsResponse>(
      `/dossiers/${dossierId}/comments`,
      { params, signal: options?.signal },
    );
  },


  /**
   * API-COMMENT-002: Tạo bình luận cho hồ sơ tour
   */
  createDossierComment: (dossierId: string, payload: CreateCommentPayload) => {
    return apiClient.post<any, DossierComment>(`/dossiers/${dossierId}/comments`, payload);
  },
};
