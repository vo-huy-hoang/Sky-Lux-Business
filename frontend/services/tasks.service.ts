import { apiClient } from '@/lib/api-client';
import {
  CreateTaskInput,
  PaginatedTasksResponse,
  QueryTaskParams,
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
};
