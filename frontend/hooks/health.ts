import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/services/health.service';

/**
 * Hook lấy thông tin sức khỏe hệ thống (Database, Memory)
 * Tự động thăm dò (polling) mỗi 30 giây để cập nhật trạng thái hoạt động thực tế
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => healthService.getSystemHealth(),
    refetchInterval: 30000, // Thăm dò trạng thái mỗi 30 giây
    retry: 1,              // Giới hạn số lần thử lại để tránh spam server khi mất kết nối
  });
}
