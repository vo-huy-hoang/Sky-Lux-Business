import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  CreateTaskInput,
  PaginatedTasksResponse,
  QueryTaskParams,
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
};
