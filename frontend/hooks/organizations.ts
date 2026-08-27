import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '@/services/organizations.service';
import { OrganizationItem } from '@/types/organization';

/**
 * Hook lấy thông tin chi tiết tổ chức
 */
export function useOrganizationProfile() {
  return useQuery({
    queryKey: ['organization-profile'],
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
      queryClient.invalidateQueries({ queryKey: ['organization-profile'] });
    },
  });
}

/**
 * Hook lấy danh sách cấu hình/thiết lập tổ chức
 */
export function useOrganizationSettings() {
  return useQuery({
    queryKey: ['organization-settings'],
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
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });
}
