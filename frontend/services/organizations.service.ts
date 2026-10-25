import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  OrganizationItem,
  OrganizationSettingItem,
  OrganizationSettings,
} from '@/types/organization';

export const organizationsService = {
  listOrganizations: (options?: RequestOptions) => {
    return apiClient.get<any, OrganizationItem[]>('/organization/all', {
      signal: options?.signal,
    });
  },

  createOrganization: (data: CreateOrganizationInput) => {
    return apiClient.post<any, OrganizationItem>('/organization', data);
  },

  /**
   * API-ORG-001: Lấy thông tin chi tiết tổ chức/doanh nghiệp
   */
  getProfile: (options?: RequestOptions) => {
    return apiClient.get<any, OrganizationItem>('/organization', {
      signal: options?.signal,
    });
  },

  /**
   * API-ORG-002: Cập nhật thông tin tổ chức/doanh nghiệp
   */
  updateProfile: (data: Partial<OrganizationItem>) => {
    return apiClient.patch<any, OrganizationItem>('/organization', data);
  },

  /**
   * API-ORG-003: Lấy danh sách thiết lập/cấu hình của tổ chức
   */
  getSettings: (options?: RequestOptions) => {
    return apiClient.get<any, OrganizationSettings>('/organization/settings', {
      signal: options?.signal,
    });
  },

  /**
   * API-ORG-004: Cập nhật cấu hình tổ chức theo key
   */
  updateSetting: (key: string, value: any) => {
    return apiClient.put<any, OrganizationSettingItem>(
      `/organization/settings/${key}`,
      {
        value,
      },
    );
  },
};

export interface CreateOrganizationInput {
  name: string;
  code: string;
  slug: string;
  timezone?: string;
  currency?: string;
}
