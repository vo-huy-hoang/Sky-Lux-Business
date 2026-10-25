import { apiClient } from '@/lib/api-client';
import { documentsService } from '@/services/documents.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('DocumentsService (Frontend)', () => {
  const dossierId = 'dossier-uuid-123';
  const docId = 'doc-uuid-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDocItem = {
    id: docId,
    organizationId: 'org-uuid',
    dossierId,
    originalName: 'hop-dong-tour.pdf',
    mimeType: 'application/pdf',
    fileSize: 102400,
    versionNo: 1,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  };

  it('API-DOCUMENT-001: getDossierDocuments calls GET /dossiers/:id/documents', async () => {
    const mockResponse = {
      items: [mockDocItem],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const params = { page: 1, limit: 10, search: 'hop-dong' };
    const result = await documentsService.getDossierDocuments(dossierId, params);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/documents`,
      { params },
    );
    expect(result).toEqual(mockResponse);
  });

  it('API-DOCUMENT-002: uploadDossierDocument calls POST /dossiers/:id/documents with FormData', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockDocItem);

    const file = new File(['dummy content'], 'hop-dong-tour.pdf', {
      type: 'application/pdf',
    });
    const payload = {
      file,
      documentTypeId: 'type-uuid-1',
      estimateId: 'est-uuid-1',
      changeNote: 'Ký kết hợp đồng',
    };

    const result = await documentsService.uploadDossierDocument(
      dossierId,
      payload,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/documents`,
      expect.any(FormData),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    expect(result).toEqual(mockDocItem);
  });

  it('API-DOCUMENT-003: getDocument calls GET /documents/:id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockDocItem);

    const result = await documentsService.getDocument(docId);

    expect(apiClient.get).toHaveBeenCalledWith(`/documents/${docId}`);
    expect(result).toEqual(mockDocItem);
  });

  it('API-DOCUMENT-004: deleteDocument calls DELETE /documents/:id', async () => {
    const mockDeleteResult = { deleted: true };
    (apiClient.delete as jest.Mock).mockResolvedValueOnce(mockDeleteResult);

    const result = await documentsService.deleteDocument(docId);

    expect(apiClient.delete).toHaveBeenCalledWith(`/documents/${docId}`);
    expect(result).toEqual(mockDeleteResult);
  });

  it('API-DOCUMENT-005: getDownloadUrl calls GET /documents/:id/download-url', async () => {
    const mockDownloadResponse = {
      downloadUrl: 'https://res.cloudinary.com/example/raw/upload/file.pdf',
      originalName: 'hop-dong-tour.pdf',
      mimeType: 'application/pdf',
      fileSize: 102400,
      versionNo: 1,
      expiresIn: 3600,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockDownloadResponse);

    const params = { versionNo: 1, expiresIn: 1800 };
    const result = await documentsService.getDownloadUrl(docId, params);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/documents/${docId}/download-url`,
      { params },
    );
    expect(result).toEqual(mockDownloadResponse);
  });

  it('API-DOCVER-001: getDocumentVersions calls GET /documents/:id/versions', async () => {
    const mockVersions = [
      {
        id: 'ver-1',
        organizationId: 'org-uuid',
        documentId: docId,
        versionNo: 1,
        fileSize: 102400,
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T00:00:00.000Z',
      },
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockVersions);

    const result = await documentsService.getDocumentVersions(docId);

    expect(apiClient.get).toHaveBeenCalledWith(`/documents/${docId}/versions`);
    expect(result).toEqual(mockVersions);
  });

  it('API-DOCVER-002: createDocumentVersion calls POST /documents/:id/versions with FormData', async () => {
    const mockUpdatedDoc = { ...mockDocItem, versionNo: 2 };
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockUpdatedDoc);

    const file = new File(['new content'], 'hop-dong-v2.pdf', {
      type: 'application/pdf',
    });
    const payload = {
      file,
      changeNote: 'Cập nhật phụ lục tour',
    };

    const result = await documentsService.createDocumentVersion(docId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/documents/${docId}/versions`,
      expect.any(FormData),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    expect(result).toEqual(mockUpdatedDoc);
  });
});
