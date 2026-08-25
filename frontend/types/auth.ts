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
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}
