import { apiClient, RequestOptions } from '@/lib/api-client';
import { LoginResponse, RefreshTokenResponse } from '@/types/auth';

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
  twoFactorEnabled: boolean;
  mustChangePassword?: boolean;
  notificationPreferences: {
    taskAssignments: boolean;
    dossierUpdates: boolean;
    appointmentReminders: boolean;
    periodicReports: boolean;
  };
  status: string;
  lastLoginAt?: string;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: string[];
}

export interface UpdateUserSettingsPayload {
  twoFactorEnabled?: boolean;
  taskAssignments?: boolean;
  dossierUpdates?: boolean;
  appointmentReminders?: boolean;
  periodicReports?: boolean;
}

export const authService = {
  login: (
    data: { email: string; password: string },
    options?: RequestOptions,
  ) =>
    apiClient.post<any, LoginResponse>('/auth/login', data, {
      signal: options?.signal,
    }),

  logout: (options?: RequestOptions) =>
    apiClient.post<any, null>(
      '/auth/logout',
      {},
      { signal: options?.signal },
    ),

  refreshToken: (options?: RequestOptions) =>
    apiClient.post<any, RefreshTokenResponse>(
      '/auth/refresh',
      {},
      { signal: options?.signal },
    ),

  getMe: (options?: RequestOptions) =>
    apiClient.get<any, AuthMeResponse>('/auth/me', { signal: options?.signal }),

  updateProfile: (data: {
    fullName: string;
    phone?: string;
    avatarUrl?: string;
  }) => apiClient.patch<any, AuthMeResponse>('/auth/me', data),

  updateSettings: (data: UpdateUserSettingsPayload) =>
    apiClient.patch<any, AuthMeResponse>('/auth/me/settings', data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.post<any, null>('/auth/change-password', data),
};
