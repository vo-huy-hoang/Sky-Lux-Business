export interface UserProfile {
  id: string;
  organizationId: string;
  organizationName?: string;
  departmentId?: string;
  departmentName?: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  user: UserProfile;
}

export interface RefreshTokenResponse {
  refreshed: boolean;
}
