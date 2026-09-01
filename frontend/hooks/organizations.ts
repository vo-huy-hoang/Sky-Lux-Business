import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '@/services/organizations.service';
import { queryKeys } from '@/lib/query-keys';
import { OrganizationItem } from '@/types/organization';

/**
 * Hook lấy thông tin chi tiết tổ chức
 */
export function useOrganizationProfile() {
  return useQuery({
    queryKey: queryKeys.organizations.profile(),
    queryFn: () => organizationsService.getProfile(),
  });
}

/**
 * Hook cập nhật thông tin tổ chức
 */
export function useUpdateOrganizationProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<OrganizationItem>) =>
      organizationsService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.profile() });
    },
  });
}

/**
 * Hook lấy danh sách cấu hình/thiết lập tổ chức
 */
export function useOrganizationSettings() {
  return useQuery({
    queryKey: queryKeys.organizations.settings(),
    queryFn: () => organizationsService.getSettings(),
  });
}

/**
 * Hook cập nhật cấu hình theo key
 */
export function useUpdateOrganizationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      organizationsService.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.settings() });
    },
  });
}

