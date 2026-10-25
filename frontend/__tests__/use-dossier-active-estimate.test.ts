import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDossierActiveEstimate } from '@/components/dossiers/detail/hooks/useDossierActiveEstimate';
import { estimatesService } from '@/services/estimates.service';
import { queryKeys } from '@/lib/query-keys';
import { EstimateItem, EstimateStatus } from '@/types/estimate';

jest.mock('@/services/estimates.service', () => ({
  estimatesService: {
    getDossierEstimates: jest.fn(),
    getEstimate: jest.fn(),
  },
}));

describe('useDossierActiveEstimate (Phase 51: Waterfall Elimination & Active Estimate Hook)', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };

  const mockEstimateV1: EstimateItem = {
    id: 'est-v1',
    dossierId: 'dos-100',
    organizationId: 'org-1',
    currency: 'VND',
    versionNo: 1,
    status: EstimateStatus.DRAFT,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockEstimateV2: EstimateItem = {
    id: 'est-v2',
    dossierId: 'dos-100',
    organizationId: 'org-1',
    currency: 'VND',
    versionNo: 2,
    status: EstimateStatus.SUBMITTED,
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
  };

  const mockDetailV2: EstimateItem = {
    ...mockEstimateV2,
    revenueLines: [{ id: 'rev-1', amount: 50000000 } as any],
    costLines: [{ id: 'cost-1', amount: 30000000 } as any],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('orchestrates dual queries and selects latest version (versionNo=2) as currentEstimate', async () => {
    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValueOnce({
      data: [mockEstimateV1, mockEstimateV2],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    (estimatesService.getEstimate as jest.Mock).mockResolvedValueOnce(mockDetailV2);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDossierActiveEstimate('dos-100'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.currentEstimate).toBeDefined());

    // Selected highest versionNo (v2)
    expect(result.current.currentEstimate?.id).toBe('est-v2');
    expect(result.current.currentEstimate?.versionNo).toBe(2);

    await waitFor(() => expect(result.current.estimate).toBeDefined());
    expect(result.current.estimate?.id).toBe('est-v2');
    expect(result.current.estimate?.revenueLines).toHaveLength(1);

    expect(estimatesService.getDossierEstimates).toHaveBeenCalledWith('dos-100', {
      signal: expect.anything(),
    });
    expect(estimatesService.getEstimate).toHaveBeenCalledWith('est-v2', {
      signal: expect.anything(),
    });
  });

  it('eliminates waterfall by using pre-cached estimates list to launch detail query immediately on frame 0', async () => {
    const wrapper = createWrapper();

    // Pre-populate TanStack Query cache as would happen when navigating from list/dashboard
    queryClient.setQueryData(queryKeys.estimates.dossierList('dos-100'), {
      data: [mockEstimateV1, mockEstimateV2],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });

    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValueOnce({
      data: [mockEstimateV1, mockEstimateV2],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    (estimatesService.getEstimate as jest.Mock).mockResolvedValueOnce(mockDetailV2);

    const { result } = renderHook(() => useDossierActiveEstimate('dos-100'), {
      wrapper,
    });

    // On INITIAL render, currentEstimate should ALREADY be resolved from cache without waiting for network!
    expect(result.current.currentEstimate?.id).toBe('est-v2');

    // And estimate query should immediately be triggered for est-v2 in parallel
    expect(estimatesService.getEstimate).toHaveBeenCalledWith('est-v2', {
      signal: expect.anything(),
    });

    await waitFor(() => expect(result.current.estimate?.id).toBe('est-v2'));
  });

  it('respects options.enabled = false when dossierId is missing or disabled', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDossierActiveEstimate(null), {
      wrapper,
    });

    expect(result.current.currentEstimate).toBeUndefined();
    expect(result.current.estimate).toBeUndefined();
    expect(estimatesService.getDossierEstimates).not.toHaveBeenCalled();
    expect(estimatesService.getEstimate).not.toHaveBeenCalled();
  });

  it('TICKET-54.2: refetch() queries fresh estimates and invalidates detail for newly created version', async () => {
    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValueOnce({
      data: [mockEstimateV1],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    (estimatesService.getEstimate as jest.Mock).mockResolvedValueOnce(mockEstimateV1);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDossierActiveEstimate('dos-100'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.currentEstimate?.id).toBe('est-v1'));

    // Giả lập user tạo phiên bản mới v2, khi gọi refetch() sẽ trả về cả v1 và v2
    (estimatesService.getDossierEstimates as jest.Mock).mockResolvedValueOnce({
      data: [mockEstimateV1, mockEstimateV2],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    (estimatesService.getEstimate as jest.Mock).mockResolvedValueOnce(mockDetailV2);

    await result.current.refetch();

    // Xác nhận getEstimate được gọi cho phiên bản mới nhất est-v2 thay vì est-v1 cũ
    expect(estimatesService.getEstimate).toHaveBeenCalledWith('est-v2', {
      signal: expect.anything(),
    });
  });
});

