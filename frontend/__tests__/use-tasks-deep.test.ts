import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTasksList, useTaskDetail } from '../hooks/use-tasks';
import { tasksService } from '../services/tasks.service';

jest.mock('../services/tasks.service');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('Deep Hook: use-tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks list and pass abort signal', async () => {
    const mockTasks = {
      data: [{ id: 't1', title: 'Task One', status: 'PENDING' }],
      meta: { total: 1 },
    };
    (tasksService.getTasks as jest.Mock).mockResolvedValueOnce(mockTasks);

    const { result } = renderHook(() => useTasksList({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Task One');
    expect(tasksService.getTasks).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('should fetch task detail when id is provided', async () => {
    const mockTask = { id: 't1', title: 'Task One', status: 'PENDING' };
    (tasksService.getTask as jest.Mock).mockResolvedValueOnce(mockTask);

    const { result } = renderHook(() => useTaskDetail('t1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.title).toBe('Task One');
    expect(tasksService.getTask).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
