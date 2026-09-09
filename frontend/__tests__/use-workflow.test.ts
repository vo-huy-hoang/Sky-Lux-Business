import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  workflowKeys,
  useWorkflowHistory,
  useApprovals,
  useSubmitDossier,
  useStartReviewDossier,
  useRequestChangesDossier,
  useResubmitDossier,
  useApproveDossier,
  useCompleteDossier,
  useLockDossier,
} from '@/hooks/workflow';
import { workflowService } from '@/services/workflow.service';
import { queryKeys } from '@/lib/query-keys';


jest.mock('@/services/workflow.service', () => ({
  workflowService: {
    submit: jest.fn(),
    startReview: jest.fn(),
    requestChanges: jest.fn(),
    resubmit: jest.fn(),
    approve: jest.fn(),
    complete: jest.fn(),
    lock: jest.fn(),
    getWorkflowHistory: jest.fn(),
    getApprovals: jest.fn(),
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

describe('useWorkflow hooks', () => {
  const dossierId = 'dossier-uuid-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockActionResult = {
    data: {
      id: dossierId,
      code: 'DOS-TEST',
      status: 'SUBMITTED',
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
    },
    meta: {},
  };

  it('should generate correct query keys', () => {
    expect(workflowKeys.all).toEqual(['workflow']);
    expect(workflowKeys.history(dossierId, { page: 1 })).toEqual(
      queryKeys.approvals.history(dossierId, { page: 1 }),
    );
    expect(workflowKeys.approvals(dossierId, { page: 1 })).toEqual(
      queryKeys.approvals.approvalsList(dossierId, { page: 1 }),
    );
  });

  it('useWorkflowHistory fetches history', async () => {
    const mockHistory = {
      data: [{ id: 'h1', fromStatus: 'DRAFT', toStatus: 'SUBMITTED', action: 'SUBMIT', createdAt: '' }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    (workflowService.getWorkflowHistory as jest.Mock).mockResolvedValue(mockHistory);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useWorkflowHistory(dossierId, { page: 1 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHistory);
    expect(workflowService.getWorkflowHistory).toHaveBeenCalledWith(
      dossierId,
      { page: 1 },
      { signal: expect.anything() },
    );
  });

  it('useApprovals fetches approvals', async () => {
    const mockApprovals = {
      data: [{ id: 'a1', stepNo: 1, stepCode: 'REV', status: 'PENDING', requestedAt: '' }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    (workflowService.getApprovals as jest.Mock).mockResolvedValue(mockApprovals);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApprovals(dossierId, { status: 'PENDING' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockApprovals);
    expect(workflowService.getApprovals).toHaveBeenCalledWith(
      dossierId,
      { status: 'PENDING' },
      { signal: expect.anything() },
    );
  });


  it('useSubmitDossier mutates and invalidates queries', async () => {
    (workflowService.submit as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId, data: { note: 'Submit' } });
    });

    expect(workflowService.submit).toHaveBeenCalledWith(dossierId, { note: 'Submit' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dossiers.detail(dossierId) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dossiers.all });
  });

  it('useStartReviewDossier executes startReview', async () => {
    (workflowService.startReview as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useStartReviewDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId });
    });

    expect(workflowService.startReview).toHaveBeenCalledWith(dossierId, undefined);
  });

  it('useRequestChangesDossier executes requestChanges', async () => {
    (workflowService.requestChanges as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestChangesDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId, data: { note: 'Change items' } });
    });

    expect(workflowService.requestChanges).toHaveBeenCalledWith(dossierId, { note: 'Change items' });
  });

  it('useResubmitDossier executes resubmit', async () => {
    (workflowService.resubmit as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useResubmitDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId, data: { note: 'Resubmitted' } });
    });

    expect(workflowService.resubmit).toHaveBeenCalledWith(dossierId, { note: 'Resubmitted' });
  });

  it('useApproveDossier executes approve', async () => {
    (workflowService.approve as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId, data: { note: 'Approved' } });
    });

    expect(workflowService.approve).toHaveBeenCalledWith(dossierId, { note: 'Approved' });
  });

  it('useCompleteDossier executes complete', async () => {
    (workflowService.complete as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCompleteDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId });
    });

    expect(workflowService.complete).toHaveBeenCalledWith(dossierId, undefined);
  });

  it('useLockDossier executes lock', async () => {
    (workflowService.lock as jest.Mock).mockResolvedValue(mockActionResult);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLockDossier(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ dossierId });
    });

    expect(workflowService.lock).toHaveBeenCalledWith(dossierId, undefined);
  });
});
