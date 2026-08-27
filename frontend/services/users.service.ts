import { apiClient } from '@/lib/api-client';
import {
  UserItem,
  QueryUserParams,
  CreateUserInput,
  UpdateUserInput,
  PaginatedUsersResponse,
} from '@/types/user';

export const usersService = {
  /**
   * API-USERS-001: Lấy danh sách người dùng phân trang và lọc
   */
  getUsers: (params?: QueryUserParams) => {
    return apiClient.get<any, PaginatedUsersResponse>('/users', { params });
  },

  /**
   * API-USERS-002: Lấy chi tiết thông tin người dùng theo ID
   */
  getUser: (id: string) => {
    return apiClient.get<any, UserItem>(`/users/${id}`);
  },

  /**
   * API-USERS-003: Tạo người dùng mới
   */
  createUser: (data: CreateUserInput) => {
    return apiClient.post<any, UserItem>('/users', data);
  },

  /**
   * API-USERS-004: Cập nhật thông tin người dùng
   */
  updateUser: (id: string, data: UpdateUserInput) => {
    return apiClient.patch<any, UserItem>(`/users/${id}`, data);
  },

  /**
   * API-USERS-005: Khóa tài khoản người dùng và thu hồi mọi phiên đăng nhập
   */
  lockUser: (id: string) => {
    return apiClient.post<any, { message: string; data?: UserItem }>(`/users/${id}/lock`);
  },

  /**
   * API-USERS-006: Mở khóa tài khoản người dùng
   */
  unlockUser: (id: string) => {
    return apiClient.post<any, { message: string; data?: UserItem }>(`/users/${id}/unlock`);
  },

  /**
   * API-USERS-007: Xóa người dùng (Soft delete)
   */
  deleteUser: (id: string) => {
    return apiClient.delete<any, { message: string; data?: { deleted: boolean } }>(`/users/${id}`);
  },

  /**
   * API-RBAC-006: Gán vai trò cho nhân viên
   */
  assignRoles: (userId: string, roleIds: string[]) => {
    return apiClient.put<any, { message: string }>(`/users/${userId}/roles`, { roleIds });
  },
};
