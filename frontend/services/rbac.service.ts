import { apiClient } from '@/lib/api-client';
import { PaginatedUsersResponse } from '@/types/user';

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

type BackendRole = Omit<RoleItem, 'permissionCount' | 'permissions'> & {
  rolePermissions?: Array<{
    scope?: string;
    permission?: RolePermissionItem;
  }>;
};

const toRoleItem = (role: BackendRole): RoleItem => ({
  ...role,
  permissionCount: role.rolePermissions?.length || 0,
  permissions: role.rolePermissions
    ?.filter((rolePermission) => rolePermission.permission)
    .map((rolePermission) => ({
      ...rolePermission.permission!,
      scope: rolePermission.scope,
    })),
});

export const rbacService = {
  // Roles APIs (API-RBAC-001, 002, 003, 005)
  getRoles: (params?: { page?: number; limit?: number; search?: string }) => {
    return apiClient
      .get<any, BackendRole[]>('/roles', { params })
      .then((roles) => roles.map(toRoleItem));
  },

  getRole: (id: string) => {
    return apiClient
      .get<any, BackendRole>(`/roles/${id}`)
      .then(toRoleItem);
  },

  createRole: (data: {
    code: string;
    name: string;
    description?: string;
    permissionCodes?: string[];
  }) => {
    return apiClient.post<any, BackendRole>('/roles', data).then(toRoleItem);
  },

  updateRole: (
    id: string,
    data: {
      name?: string;
      description?: string;
      permissionCodes?: string[];
    },
  ) => {
    return apiClient
      .patch<any, BackendRole>(`/roles/${id}`, data)
      .then(toRoleItem);
  },

  assignRolePermissions: (
    id: string,
    permissions: Array<{ permissionId: string; scope: 'OWN' | 'TEAM' | 'ALL' }>,
  ) => {
    return apiClient.put<any, { message: string }>(`/roles/${id}/permissions`, {
      permissions,
    });
  },

  // Permissions API (API-RBAC-004)
  getPermissions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
  }) => {
    return apiClient.get<any, PermissionItem[]>('/permissions', { params });
  },

  // Users & Role Assignment APIs (API-RBAC-006)
  getUsers: () => {
    return apiClient.get<any, PaginatedUsersResponse>('/users');
  },

  assignUserRoles: (userId: string, roleIds: string[]) => {
    return apiClient.put<any, any>(`/users/${userId}/roles`, { roleIds });
  },
};
