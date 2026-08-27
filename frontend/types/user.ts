export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface UserDepartment {
  id: string;
  name: string;
  code?: string;
}

export interface UserRole {
  id: string;
  code: string;
  name: string;
}

export interface UserItem {
  id: string;
  organizationId: string;
  departmentId?: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  lastLoginAt?: string;
  department?: UserDepartment;
  roles?: UserRole[];
  createdAt: string;
  updatedAt?: string;
}

export interface QueryUserParams {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
  departmentId?: string;
  status?: UserStatus;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  employeeCode?: string;
  password?: string;
  phone?: string;
  avatarUrl?: string;
  departmentId?: string;
  roleIds?: string[];
  status?: UserStatus;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  employeeCode?: string;
  password?: string;
  phone?: string;
  avatarUrl?: string;
  departmentId?: string;
  roleIds?: string[];
  status?: UserStatus;
}

export interface PaginatedUsersResponse {
  data: UserItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
