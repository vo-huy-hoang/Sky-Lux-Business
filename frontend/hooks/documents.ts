import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/services/documents.service';
import { queryKeys } from '@/lib/query-keys';
import {
  QueryDocumentParams,
  UploadDocumentPayload,
  DownloadUrlParams,
  CreateDocumentVersionPayload,
} from '@/types/document';

export const documentKeys = {
  all: ['documents'] as const,
  dossierList: (dossierId: string, params?: QueryDocumentParams) =>
    queryKeys.documents.dossierList(dossierId, params),
  detail: (id: string) => queryKeys.documents.detail(id),
  versions: (id: string) => queryKeys.documents.versions(id),
  downloadUrl: (id: string, params?: DownloadUrlParams) =>
    queryKeys.documents.downloadUrl(id, params),
};


/**
 * API-DOCUMENT-001: Hook lấy danh sách tài liệu của hồ sơ
 */
export function useDossierDocuments(
  dossierId: string,
  params?: QueryDocumentParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: documentKeys.dossierList(dossierId, params),
    queryFn: () => documentsService.getDossierDocuments(dossierId, params),
    enabled: Boolean(dossierId) && (options?.enabled ?? true),
  });
}

/**
 * API-DOCUMENT-002: Hook tải lên tài liệu cho hồ sơ
 */
export function useUploadDossierDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dossierId,
      payload,
    }: {
      dossierId: string;
      payload: UploadDocumentPayload;
    }) => documentsService.uploadDossierDocument(dossierId, payload),
    onSuccess: (data, variables) => {
      const { dossierId } = variables;
      queryClient.invalidateQueries({
        queryKey: documentKeys.dossierList(dossierId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dossiers.detail(dossierId),
      });
    },
  });
}

/**
 * API-DOCUMENT-003: Hook lấy chi tiết tài liệu theo ID
 */
export function useDocumentDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentsService.getDocument(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * API-DOCUMENT-004: Hook xóa tài liệu
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; dossierId?: string }) =>
      documentsService.deleteDocument(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      if (variables.dossierId) {
        queryClient.invalidateQueries({
          queryKey: documentKeys.dossierList(variables.dossierId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.dossiers.detail(variables.dossierId),
        });
      }
    },
  });
}

/**
 * API-DOCUMENT-005: Hook lấy signed download URL của tài liệu
 */
export function useDocumentDownloadUrl(
  id: string,
  params?: DownloadUrlParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: documentKeys.downloadUrl(id, params),
    queryFn: () => documentsService.getDownloadUrl(id, params),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * API-DOCUMENT-005: Hook kích hoạt tải về tài liệu
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({
      id,
      params,
    }: {
      id: string;
      params?: DownloadUrlParams;
    }) => {
      const result = await documentsService.getDownloadUrl(id, params);
      if (result && result.downloadUrl && typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.originalName || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return result;
    },
  });
}

/**
 * API-DOCVER-001: Hook lấy danh sách các phiên bản của tài liệu
 */
export function useDocumentVersions(
  id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: documentKeys.versions(id),
    queryFn: () => documentsService.getDocumentVersions(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/**
 * API-DOCVER-002: Hook tải lên phiên bản mới của tài liệu
 */
export function useCreateDocumentVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      dossierId?: string;
      payload: CreateDocumentVersionPayload;
    }) => documentsService.createDocumentVersion(id, payload),
    onSuccess: (data, variables) => {
      const { id, dossierId } = variables;
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.versions(id) });
      if (dossierId) {
        queryClient.invalidateQueries({
          queryKey: documentKeys.dossierList(dossierId),
        });
      }
    },
  });
}
