import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  NotificationItem,
  NotificationQuery,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
} from '@/types/notification';

export const notificationsService = {
  getNotifications: (
    params?: NotificationQuery,
    options?: RequestOptions,
  ): Promise<PaginatedNotificationsResponse> =>
    apiClient.get<any, PaginatedNotificationsResponse>('/notifications', {
      params,
      signal: options?.signal,
    }),

  getUnreadCount: (
    options?: RequestOptions,
  ): Promise<UnreadCountResponse> =>
    apiClient.get<any, UnreadCountResponse>('/notifications/unread-count', {
      signal: options?.signal,
    }),

  getNotification: (
    id: string,
    options?: RequestOptions,
  ): Promise<NotificationItem> =>
    apiClient.get<any, NotificationItem>(`/notifications/${id}`, {
      signal: options?.signal,
    }),

  markAsRead: (id: string): Promise<NotificationItem> =>
    apiClient.patch<any, NotificationItem>(`/notifications/${id}/read`),

  markAllAsRead: (): Promise<{ updatedCount: number }> =>
    apiClient.patch<any, { updatedCount: number }>('/notifications/read-all'),

  deleteNotification: (id: string): Promise<void> =>
    apiClient.delete<any, void>(`/notifications/${id}`),
};
