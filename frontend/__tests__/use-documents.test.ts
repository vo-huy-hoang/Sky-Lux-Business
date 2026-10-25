import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useDossierDocuments,
  useUploadDossierDocument,
  useDocumentDetail,
  useDeleteDocument,
  useDocumentDownloadUrl,
  useDownloadDocument,
  useDocumentVersions,
  useCreateDocumentVersion,
} from '@/hooks/documents';
import { documentsService } from '@/services/documents.service';

jest.mock('@/services/documents.service', () => ({
  documentsService: {
    getDossierDocuments: jest.fn(),
    uploadDossierDocument: jest.fn(),
    getDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getDownloadUrl: jest.fn(),
    getDocumentVersions: jest.fn(),
    createDocumentVersion: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useDocuments hooks', () => {
  const dossierId = 'dossier-uuid-test';
  const docId = 'doc-uuid-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDocItem = {
    id: docId,
    organizationId: 'org-uuid',
    dossierId,
    originalName: 'hop-dong.pdf',
    mimeType: 'application/pdf',
    fileSize: 50000,
    versionNo: 1,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  };

  it('useDossierDocuments fetches documents list', async () => {
    const mockResponse = {
      items: [mockDocItem],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    (documentsService.getDossierDocuments as jest.Mock).mockResolvedValueOnce(
      mockResponse,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDossierDocuments(dossierId, { page: 1, limit: 10 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse);
    expect(documentsService.getDossierDocuments).toHaveBeenCalledWith(
      dossierId,
      { page: 1, limit: 10 },
    );
  });

  it('useDossierDocuments respects options.enabled = false and does not fetch', async () => {
    (documentsService.getDossierDocuments as jest.Mock).mockClear();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDossierDocuments(dossierId, { page: 1, limit: 10 }, { enabled: false }),
      { wrapper: Wrapper },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(documentsService.getDossierDocuments).not.toHaveBeenCalled();
  });

  it('useUploadDossierDocument uploads file and invalidates queries', async () => {
    (documentsService.uploadDossierDocument as jest.Mock).mockResolvedValueOnce(
      mockDocItem,
    );

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUploadDossierDocument(), {
      wrapper: Wrapper,
    });

    const file = new File(['test'], 'hop-dong.pdf', { type: 'application/pdf' });
    await act(async () => {
      await result.current.mutateAsync({
        dossierId,
        payload: { file, changeNote: 'Initial upload' },
      });
    });

    expect(documentsService.uploadDossierDocument).toHaveBeenCalledWith(
      dossierId,
      { file, changeNote: 'Initial upload' },
    );
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('useDocumentDetail fetches document by ID', async () => {
    (documentsService.getDocument as jest.Mock).mockResolvedValueOnce(
      mockDocItem,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDocumentDetail(docId), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDocItem);
    expect(documentsService.getDocument).toHaveBeenCalledWith(docId);
  });

  it('useDeleteDocument removes document and invalidates cache', async () => {
    (documentsService.deleteDocument as jest.Mock).mockResolvedValueOnce({
      deleted: true,
    });

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: docId, dossierId });
    });

    expect(documentsService.deleteDocument).toHaveBeenCalledWith(docId);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('useDocumentDownloadUrl queries download URL', async () => {
    const mockDownload = {
      downloadUrl: 'https://example.com/file.pdf',
      originalName: 'hop-dong.pdf',
      mimeType: 'application/pdf',
      fileSize: 50000,
      versionNo: 1,
      expiresIn: 3600,
    };
    (documentsService.getDownloadUrl as jest.Mock).mockResolvedValueOnce(
      mockDownload,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDocumentDownloadUrl(docId), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDownload);
    expect(documentsService.getDownloadUrl).toHaveBeenCalledWith(
      docId,
      undefined,
    );
  });

  it('useDownloadDocument triggers signed URL download', async () => {
    const mockDownload = {
      downloadUrl: 'https://example.com/file.pdf',
      originalName: 'hop-dong.pdf',
      mimeType: 'application/pdf',
      fileSize: 50000,
      versionNo: 1,
      expiresIn: 3600,
    };
    (documentsService.getDownloadUrl as jest.Mock).mockResolvedValueOnce(
      mockDownload,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const res = await result.current.mutateAsync({ id: docId });
      expect(res).toEqual(mockDownload);
    });

    expect(documentsService.getDownloadUrl).toHaveBeenCalledWith(
      docId,
      undefined,
    );
  });

  it('useDocumentVersions queries version history', async () => {
    const mockVersions = [
      {
        id: 'ver-1',
        organizationId: 'org-uuid',
        documentId: docId,
        versionNo: 1,
        fileSize: 50000,
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T00:00:00.000Z',
      },
    ];
    (documentsService.getDocumentVersions as jest.Mock).mockResolvedValueOnce(
      mockVersions,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDocumentVersions(docId), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockVersions);
    expect(documentsService.getDocumentVersions).toHaveBeenCalledWith(docId);
  });

  it('useCreateDocumentVersion uploads new version and invalidates cache', async () => {
    const mockUpdatedDoc = { ...mockDocItem, versionNo: 2 };
    (documentsService.createDocumentVersion as jest.Mock).mockResolvedValueOnce(
      mockUpdatedDoc,
    );

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDocumentVersion(), {
      wrapper: Wrapper,
    });

    const file = new File(['v2 content'], 'hop-dong-v2.pdf', {
      type: 'application/pdf',
    });
    await act(async () => {
      await result.current.mutateAsync({
        id: docId,
        dossierId,
        payload: { file, changeNote: 'V2 changes' },
      });
    });

    expect(documentsService.createDocumentVersion).toHaveBeenCalledWith(
      docId,
      { file, changeNote: 'V2 changes' },
    );
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
