import { apiClient } from '@/lib/api-client';
import { PaginatedResponse } from '@/types/api';

export interface RolePermissionItem {
  id: string;
  code: string;
  name: string;
  module?: string;
  scope?: string;
}

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissionCount: number;
  permissions?: RolePermissionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module?: string;
  description?: string;
  createdAt: string;
}

export interface PermissionsResponse {
  items: PermissionItem[];
  modules: Record<string, PermissionItem[]>;
  total: number;
  page: number;
  limit: number;
}

export interface UserItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: string;
  department?: { id: string; name: string };
  roles: Array<{ id: string; code: string; name: string }>;
  createdAt: string;
}

export const rbacService = {
  // Roles APIs (API-RBAC-001, 002, 003, 005)
  getRoles: (params?: { page?: number; limit?: number; search?: string }) => {
    return apiClient.get<any, PaginatedResponse<RoleItem>>('/roles', { params });
  },

  getRole: (id: string) => {
    return apiClient.get<any, RoleItem>(`/roles/${id}`);
  },

  createRole: (data: {
    code: string;
    name: string;
    description?: string;
    permissionCodes?: string[];
  }) => {
    return apiClient.post<any, RoleItem>('/roles', data);
  },

  updateRole: (
    id: string,
    data: {
      name?: string;
      description?: string;
      permissionCodes?: string[];
    },
  ) => {
    return apiClient.patch<any, RoleItem>(`/roles/${id}`, data);
  },

  assignRolePermissions: (id: string, permissionCodes: string[]) => {
    return apiClient.put<any, RoleItem>(`/roles/${id}/permissions`, {
      permissionCodes,
    });
  },

  // Permissions API (API-RBAC-004)
  getPermissions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
  }) => {
    return apiClient.get<any, PermissionsResponse>('/permissions', { params });
  },

  // Users & Role Assignment APIs (API-RBAC-006)
  getUsers: () => {
    return apiClient.get<any, UserItem[]>('/users');
  },

  assignUserRoles: (userId: string, roleIds: string[]) => {
    return apiClient.put<any, any>(`/users/${userId}/roles`, { roleIds });
  },
};
