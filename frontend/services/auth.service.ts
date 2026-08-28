import { apiClient } from '@/lib/api-client';

export interface AuthMeResponse {
  id: string;
  organizationId: string;
  organization?: { name?: string };
  departmentId?: string;
  department?: { name?: string };
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: string;
  lastLoginAt?: string;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: string[];
}

export const authService = {
  getMe: () => apiClient.get<any, AuthMeResponse>('/auth/me'),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.post<any, { message: string }>('/auth/change-password', data),
};
