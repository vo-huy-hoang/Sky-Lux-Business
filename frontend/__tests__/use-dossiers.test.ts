import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useDossierComments,
  useCreateDossierComment,
  useDossiersList,
  useDossierDetail,
  useUpdateDossierMetadata,
} from '@/hooks/dossiers';
import { dossiersService } from '@/services/dossiers.service';
import { queryKeys } from '@/lib/query-keys';


jest.mock('@/services/dossiers.service', () => ({
  dossiersService: {
    getDossiers: jest.fn(),
    getDossier: jest.fn(),
    updateDossier: jest.fn(),
    getDossierComments: jest.fn(),
    createDossierComment: jest.fn(),
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

describe('useDossiers hooks', () => {
  const dossierId = 'dossier-uuid-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockComment = {
    id: 'comm-1',
    organizationId: 'org-1',
    dossierId,
    userId: 'user-1',
    content: 'Trao đổi thử nghiệm',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  };

  it('useDossierComments fetches comments successfully (API-COMMENT-001)', async () => {
    const commentsResponse = {
      data: [mockComment],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    };
    (dossiersService.getDossierComments as jest.Mock).mockResolvedValueOnce(
      commentsResponse,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDossierComments(dossierId), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(commentsResponse);
    expect(dossiersService.getDossierComments).toHaveBeenCalledWith(
      dossierId,
      undefined,
      { signal: expect.anything() },
    );
  });


  it('useCreateDossierComment executes mutation and invalidates queries (API-COMMENT-002)', async () => {
    (dossiersService.createDossierComment as jest.Mock).mockResolvedValueOnce(
      mockComment,
    );

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDossierComment(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        dossierId,
        payload: { content: 'Trao đổi thử nghiệm' },
      });
    });

    expect(dossiersService.createDossierComment).toHaveBeenCalledWith(
      dossierId,
      { content: 'Trao đổi thử nghiệm' },
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.dossiers.comments(dossierId),
    });
  });

  it('useDossiersList fetches list of dossiers', async () => {
    const mockList = { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    (dossiersService.getDossiers as jest.Mock).mockResolvedValueOnce(mockList);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDossiersList(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockList);
  });

  it('useDossierDetail fetches dossier detail', async () => {
    const mockDossier = { id: dossierId, code: 'HS001' };
    (dossiersService.getDossier as jest.Mock).mockResolvedValueOnce(mockDossier);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDossierDetail(dossierId), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDossier);
  });

  it('useUpdateDossierMetadata executes mutation and invalidates queries', async () => {
    const mockUpdated = { id: dossierId, name: 'New Name' };
    (dossiersService.updateDossier as jest.Mock).mockResolvedValueOnce(mockUpdated);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateDossierMetadata(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: dossierId,
        data: { name: 'New Name' },
      });
    });

    expect(dossiersService.updateDossier).toHaveBeenCalledWith(dossierId, {
      name: 'New Name',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.dossiers.detail(dossierId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.dossiers.all,
    });
  });
});

