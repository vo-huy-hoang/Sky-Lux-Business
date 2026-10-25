import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  PaginatedTasksResponse,
  QueryTaskParams,
  TaskActionInput,
  TaskExtensionRequestInput,
  CreateChecklistItemInput,
  CreateTaskInput,
  UpdateChecklistItemInput,
  TaskChecklistItem,
  TaskItem,
  UpdateTaskInput,
} from '@/types/task';

type ApiDataEnvelope<T> = { data: T; meta?: unknown };

function unwrapData<T>(response: T | ApiDataEnvelope<T>): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'meta' in response
  ) {
    return (response as ApiDataEnvelope<T>).data;
  }
  return response as T;
}

export const tasksService = {
  getTasks: (params?: QueryTaskParams, options?: RequestOptions) =>
    apiClient.get<any, PaginatedTasksResponse>('/tasks', {
      params,
      signal: options?.signal,
    }),

  getTask: async (id: string, options?: RequestOptions) =>
    unwrapData(
      await apiClient.get<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${id}`,
        { signal: options?.signal },
      ),
    ),

  createTask: async (data: CreateTaskInput) =>
    unwrapData(
      await apiClient.post<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        '/tasks',
        data,
      ),
    ),

  updateTask: async (id: string, data: UpdateTaskInput) =>
    unwrapData(
      await apiClient.patch<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${id}`,
        data,
      ),
    ),

  deleteTask: (id: string) => apiClient.delete<any, void>(`/tasks/${id}`),

  startTask: async (id: string, data?: TaskActionInput) =>
    unwrapData(
      await apiClient.post<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${id}/start`,
        data || {},
      ),
    ),

  completeTask: async (id: string, data?: TaskActionInput) =>
    unwrapData(
      await apiClient.post<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${id}/complete`,
        data || {},
      ),
    ),

  requestExtension: async (id: string, data: TaskExtensionRequestInput) =>
    unwrapData(
      await apiClient.post<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${id}/request-extension`,
        data,
      ),
    ),

  getChecklist: async (taskId: string) =>
    unwrapData(
      await apiClient.get<
        any,
        TaskChecklistItem[] | ApiDataEnvelope<TaskChecklistItem[]>
      >(`/tasks/${taskId}/checklist`),
    ),

  addChecklistItem: async (taskId: string, data: CreateChecklistItemInput) =>
    unwrapData(
      await apiClient.post<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${taskId}/checklist`,
        data,
      ),
    ),

  updateChecklistItem: async (
    taskId: string,
    itemId: string,
    data: UpdateChecklistItemInput,
  ) =>
    unwrapData(
      await apiClient.patch<any, TaskItem | ApiDataEnvelope<TaskItem>>(
        `/tasks/${taskId}/checklist/${itemId}`,
        data,
      ),
    ),
};
