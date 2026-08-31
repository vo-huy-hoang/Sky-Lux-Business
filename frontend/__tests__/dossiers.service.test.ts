import { apiClient } from '@/lib/api-client';
import { dossiersService } from '@/services/dossiers.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('DossiersService (Frontend)', () => {
  const dossierId = 'dossier-uuid-123';
  const commentId = 'comment-uuid-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCommentItem = {
    id: commentId,
    organizationId: 'org-uuid',
    dossierId,
    userId: 'user-uuid',
    content: 'Trao đổi về lịch trình đón khách',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    user: {
      id: 'user-uuid',
      fullName: 'Nguyen Van Sales',
      email: 'sales@example.com',
    },
  };

  it('API-COMMENT-001: getDossierComments calls GET /dossiers/:id/comments without params', async () => {
    const mockComments = {
      data: [mockCommentItem],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockComments);

    const result = await dossiersService.getDossierComments(dossierId);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/comments`,
      { params: undefined },
    );
    expect(result).toEqual(mockComments);
  });

  it('API-COMMENT-001: getDossierComments calls GET /dossiers/:id/comments with params', async () => {
    const mockComments = {
      data: [mockCommentItem],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockComments);

    const params = { page: 1, pageSize: 20, search: 'lịch trình' };
    const result = await dossiersService.getDossierComments(dossierId, params);

    expect(apiClient.get).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/comments`,
      { params },
    );
    expect(result).toEqual(mockComments);
  });

  it('API-COMMENT-002: createDossierComment calls POST /dossiers/:id/comments with payload', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockCommentItem);

    const payload = {
      content: 'Trao đổi về lịch trình đón khách',
      parentId: 'parent-comment-uuid',
    };

    const result = await dossiersService.createDossierComment(
      dossierId,
      payload,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      `/dossiers/${dossierId}/comments`,
      payload,
    );
    expect(result).toEqual(mockCommentItem);
  });

  it('API-DOSSIER-001: getDossiers calls GET /dossiers with params', async () => {
    const mockList = {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockList);

    const params = { page: 1, limit: 10, search: 'Tour VIP' };
    const result = await dossiersService.getDossiers(params);

    expect(apiClient.get).toHaveBeenCalledWith('/dossiers', { params });
    expect(result).toEqual(mockList);
  });

  it('API-DOSSIER-002: getDossier calls GET /dossiers/:id', async () => {
    const mockDossier = { id: dossierId, code: 'HS001', name: 'Tour' };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockDossier);

    const result = await dossiersService.getDossier(dossierId);

    expect(apiClient.get).toHaveBeenCalledWith(`/dossiers/${dossierId}`);
    expect(result).toEqual(mockDossier);
  });

  it('API-DOSSIER-003: updateDossier calls PATCH /dossiers/:id with payload', async () => {
    const mockUpdated = { id: dossierId, name: 'Updated Tour' };
    (apiClient.patch as jest.Mock).mockResolvedValueOnce(mockUpdated);

    const updatePayload = { name: 'Updated Tour' };
    const result = await dossiersService.updateDossier(dossierId, updatePayload);

    expect(apiClient.patch).toHaveBeenCalledWith(
      `/dossiers/${dossierId}`,
      updatePayload,
    );
    expect(result).toEqual(mockUpdated);
  });
});
