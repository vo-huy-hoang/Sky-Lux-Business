import { apiClient } from '@/lib/api-client';
import {
  DocumentItem,
  DocumentVersionItem,
  QueryDocumentParams,
  UploadDocumentPayload,
  DownloadUrlResponse,
  DownloadUrlParams,
  CreateDocumentVersionPayload,
  QueryDocumentVersionParams,
} from '@/types/document';
import { PaginatedResponse, PaginatedMetaResponse } from '@/types/api';

export const documentsService = {
  /**
   * API-DOCUMENT-001: Lấy danh sách tài liệu của hồ sơ
   */
  getDossierDocuments: (dossierId: string, params?: QueryDocumentParams) => {
    return apiClient.get<any, PaginatedResponse<DocumentItem>>(
      `/dossiers/${dossierId}/documents`,
      { params },
    );
  },

  /**
   * API-DOCUMENT-002: Tải lên tài liệu cho hồ sơ
   */
  uploadDossierDocument: (
    dossierId: string,
    payload: UploadDocumentPayload,
  ) => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.documentTypeId) {
      formData.append('documentTypeId', payload.documentTypeId);
    }
    if (payload.estimateId) {
      formData.append('estimateId', payload.estimateId);
    }
    if (payload.changeNote) {
      formData.append('changeNote', payload.changeNote);
    }

    return apiClient.post<any, DocumentItem>(
      `/dossiers/${dossierId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
  },

  /**
   * API-DOCUMENT-003: Lấy chi tiết tài liệu theo ID
   */
  getDocument: (id: string) => {
    return apiClient.get<any, DocumentItem>(`/documents/${id}`);
  },

  /**
   * API-DOCUMENT-004: Xóa tài liệu
   */
  deleteDocument: (id: string) => {
    return apiClient.delete<any, { deleted: boolean }>(`/documents/${id}`);
  },

  /**
   * API-DOCUMENT-005: Lấy signed URL download tài liệu
   */
  getDownloadUrl: (id: string, params?: DownloadUrlParams) => {
    return apiClient.get<any, DownloadUrlResponse>(
      `/documents/${id}/download-url`,
      { params },
    );
  },

  /**
   * API-DOCVER-001: Lấy danh sách các phiên bản của tài liệu
   */
  getDocumentVersions: (id: string, params?: QueryDocumentVersionParams) => {
    return apiClient.get<any, PaginatedMetaResponse<DocumentVersionItem>>(
      `/documents/${id}/versions`,
      ...(params ? [{ params }] : []),
    );
  },

  /**
   * API-DOCVER-002: Tải lên phiên bản mới của tài liệu
   */
  createDocumentVersion: (
    id: string,
    payload: CreateDocumentVersionPayload,
  ) => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.documentTypeId) {
      formData.append('documentTypeId', payload.documentTypeId);
    }
    if (payload.changeNote) {
      formData.append('changeNote', payload.changeNote);
    }
    if (payload.versionNote) {
      formData.append('versionNote', payload.versionNote);
    }
    if (payload.description) {
      formData.append('description', payload.description);
    }

    return apiClient.post<any, DocumentItem>(
      `/documents/${id}/versions`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
  },
};
