import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { rbacService, RoleItem } from '@/services/rbac.service';
import { queryKeys } from '@/lib/query-keys';
import {
  UserItem,
  QueryUserParams,
  CreateUserInput,
  UpdateUserInput,
} from '@/types/user';
import { message } from 'antd';

/**
 * Deep Hook: Lấy danh sách người dùng phân trang và tìm kiếm
 * Tự động gắn AbortSignal và quản lý queryKeys chuẩn
 */
export function useUsersList(params?: QueryUserParams, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) => usersService.getUsers(params, { signal }),
    enabled: options?.enabled,
  });

  const rawData = query.data;
  const users: UserItem[] = Array.isArray(rawData)
    ? rawData
    : rawData?.data || [];
  const total: number = Array.isArray(rawData)
    ? rawData.length
    : rawData?.meta?.total || users.length;

  return {
    ...query,
    users,
    total,
  };
}

/**
 * Deep Hook: Lấy chi tiết thông tin một người dùng
 */
export function useUserDetail(id?: string | null) {
  return useQuery({
    queryKey: queryKeys.users.detail(id || ''),
    queryFn: ({ signal }) => usersService.getUser(id!, { signal }),
    enabled: Boolean(id),
  });
}

/**
 * Deep Hook: Lấy danh sách vai trò cho bộ lọc và gán quyền
 */
export function useUserRoles(search?: string) {
  return useQuery({
    queryKey: queryKeys.users.roles(search),
    queryFn: ({ signal }) => rbacService.getRoles({ search }, { signal }),
  });
}

/**
 * Deep Hook: Đóng gói các thao tác đột biến người dùng (Khóa, Mở khóa, Xóa, Tạo, Sửa)
 * Tự động cập nhật và làm mới cache toàn hệ thống
 */
export function useUserMutations() {
  const queryClient = useQueryClient();

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const lockMutation = useMutation({
    mutationFn: (id: string) => usersService.lockUser(id),
    onSuccess: () => {
      message.success('Đã khóa tài khoản người dùng thành công');
      invalidateUsers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi khóa tài khoản');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersService.unlockUser(id),
    onSuccess: () => {
      message.success('Đã mở khóa tài khoản người dùng thành công');
      invalidateUsers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi mở khóa tài khoản');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      message.success('Đã xóa người dùng thành công');
      invalidateUsers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi xóa người dùng');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserInput) => usersService.createUser(data),
    onSuccess: () => {
      message.success('Đã tạo người dùng mới thành công');
      invalidateUsers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi tạo người dùng');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      usersService.updateUser(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật thông tin người dùng thành công');
      invalidateUsers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi cập nhật người dùng');
    },
  });

  return {
    lockUser: lockMutation.mutateAsync,
    isLocking: lockMutation.isPending,
    lockMutation,
    unlockUser: unlockMutation.mutateAsync,
    isUnlocking: unlockMutation.isPending,
    unlockMutation,
    deleteUser: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteMutation,
    createUser: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createMutation,
    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateMutation,
  };
}
