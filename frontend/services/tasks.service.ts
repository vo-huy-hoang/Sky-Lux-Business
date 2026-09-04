import { apiClient } from '@/lib/api-client';
import {
  CreateTaskInput,
  PaginatedTasksResponse,
  QueryTaskParams,
  TaskActionInput,
  TaskExtensionRequestInput,
  TaskItem,
  UpdateTaskInput,
} from '@/types/task';

export const tasksService = {
  getTasks: (params?: QueryTaskParams) =>
    apiClient.get<any, PaginatedTasksResponse>('/tasks', { params }),

  getTask: (id: string) => apiClient.get<any, TaskItem>(`/tasks/${id}`),

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
};
