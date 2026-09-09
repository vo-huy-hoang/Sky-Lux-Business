import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { queryKeys } from '@/lib/query-keys';
import {
  TaskItem,
  QueryTaskParams,
  CreateTaskInput,
  UpdateTaskInput,
  PaginatedTasksResponse,
} from '@/types/task';
import { message } from 'antd';

/**
 * Deep Hook: Lấy danh sách công việc điều hành / cá nhân
 * Tự động gắn AbortSignal và quản lý queryKeys
 */
export function useTasksList(params?: QueryTaskParams) {
  const query = useQuery<PaginatedTasksResponse>({
    queryKey: queryKeys.tasks.list(params),
    queryFn: ({ signal }) => tasksService.getTasks(params, { signal }),
  });

  const raw = query.data;
  const legacy = raw as (typeof raw & {
    items?: TaskItem[];
    total?: number;
  }) | undefined;
  const tasks: TaskItem[] = raw?.data || legacy?.items || [];
  const total: number = raw?.meta?.total ?? legacy?.total ?? tasks.length;

  return {
    ...query,
    tasks,
    total,
  };
}

/**
 * Deep Hook: Lấy chi tiết một công việc theo ID
 */
export function useTaskDetail(id?: string | null) {
  return useQuery<TaskItem>({
    queryKey: queryKeys.tasks.detail(id || ''),
    queryFn: ({ signal }) => tasksService.getTask(id!, { signal }),
    enabled: Boolean(id),
  });
}

/**
 * Deep Hook: Các thao tác cập nhật công việc (Tạo mới, Cập nhật trạng thái, Sửa)
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskInput) => tasksService.createTask(data),
    onSuccess: () => {
      message.success('Đã tạo công việc mới thành công');
      invalidateTasks();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi tạo công việc');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      tasksService.updateTask(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật công việc thành công');
      invalidateTasks();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi cập nhật công việc');
    },
  });

  return {
    createTask: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTask: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
