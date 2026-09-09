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

export const tasksService = {
  getTasks: (params?: QueryTaskParams, options?: RequestOptions) =>
    apiClient.get<any, PaginatedTasksResponse>('/tasks', {
      params,
      signal: options?.signal,
    }),

  getTask: (id: string, options?: RequestOptions) =>
    apiClient.get<any, TaskItem>(`/tasks/${id}`, {
      signal: options?.signal,
    }),

  createTask: (data: CreateTaskInput) =>
    apiClient.post<any, TaskItem>('/tasks', data),

  updateTask: (id: string, data: UpdateTaskInput) =>
    apiClient.patch<any, TaskItem>(`/tasks/${id}`, data),

  deleteTask: (id: string) => apiClient.delete<any, void>(`/tasks/${id}`),

  startTask: (id: string, data?: TaskActionInput) =>
    apiClient.post<any, TaskItem>(`/tasks/${id}/start`, data || {}),

  completeTask: (id: string, data?: TaskActionInput) =>
    apiClient.post<any, TaskItem>(`/tasks/${id}/complete`, data || {}),

  requestExtension: (id: string, data: TaskExtensionRequestInput) =>
    apiClient.post<any, TaskItem>(`/tasks/${id}/request-extension`, data),

  getChecklist: (taskId: string) =>
    apiClient.get<any, TaskChecklistItem[]>(`/tasks/${taskId}/checklist`),

  addChecklistItem: (taskId: string, data: CreateChecklistItemInput) =>
    apiClient.post<any, TaskItem>(`/tasks/${taskId}/checklist`, data),

  updateChecklistItem: (taskId: string, itemId: string, data: UpdateChecklistItemInput) =>
    apiClient.patch<any, TaskItem>(`/tasks/${taskId}/checklist/${itemId}`, data),
};
