import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { App as AntApp } from 'antd';
import Cookies from 'js-cookie';
import { apiClient, API_BASE_URL } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { notificationsService } from '@/services/notifications.service';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { NotificationItem, NotificationQuery } from '@/types/notification';
import { calculateBackoffWithJitter } from '@/lib/backoff';

/**
 * Hook kết nối luồng Server-Sent Events (SSE) nhận thông báo thời gian thực
 */
export function useNotificationsRealtime(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { notification } = AntApp.useApp();
  const queryClient = useQueryClient();
  const router = useRouter();
  const setNotificationsStatus = useUIStore((state) => state.setNotificationsStatus);
  const syncSingleBackendNotification = useNotificationStore(
    (state) => state.syncSingleBackendNotification,
  );
  const setServerUnreadCount = useNotificationStore(
    (state) => state.setServerUnreadCount,
  );
  const markAsReadStore = useNotificationStore((state) => state.markAsRead);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<number>(0);
  const connectRef = useRef<() => void>(() => {});
  const authAccessToken = useAuthStore((state) => state.accessToken);
  const [tokenTrigger, setTokenTrigger] = useState<string>(authAccessToken || Cookies.get('access_token') || '');


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTokenRefreshed = (e: Event) => {
      const customEvt = e as CustomEvent<{ accessToken: string }>;
      const newToken = customEvt.detail?.accessToken || Cookies.get('access_token') || '';
      if (newToken && newToken !== tokenTrigger) {
        setTokenTrigger(newToken);
      }
    };
    window.addEventListener('skylux:token-refreshed', handleTokenRefreshed);
    return () => {
      window.removeEventListener('skylux:token-refreshed', handleTokenRefreshed);
    };
  }, [tokenTrigger]);

  const connect = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    let streamToken = '';
    try {
      const response = await apiClient.get<any, { token: string }>('/auth/stream-token');
      streamToken = response.token;
    } catch {
      setNotificationsStatus('connected');
      return;
    }
    if (!streamToken) return;

    try {
      const eventSource = new EventSource(
        `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(streamToken)}`,
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        attemptRef.current = 0;
        setNotificationsStatus('connected');
        // Invalidate và làm mới dữ liệu thông báo khi kết nối thành công
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, payload } = parsed as { type: string; payload: any };

          if (type === 'notification.created') {
            const newNotif = payload as NotificationItem;
            // 1. Cập nhật Store đồng bộ tức thời
            syncSingleBackendNotification(newNotif);

            // 2. Invalidate TanStack Query để refetch dữ liệu tươi mới
            queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.lists(),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.unreadCount(),
            });

            if (newNotif.type === 'TASK') {
              queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
            }

            const dossierId = newNotif.metadata?.dossierId;
            if (dossierId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.dossiers.changeRequests(dossierId),
              });
            }

            // 3. Hiển thị popup toast nổi góc màn hình
            notification.info({
              title: newNotif.title,
              description: newNotif.content,
              placement: 'topRight',
              duration: 5,
              onClick: () => {
                if (newNotif.linkUrl) {
                  router.push(newNotif.linkUrl);
                }
              },
            });
          } else if (type === 'notification.read') {
            const { id } = payload as { id: string };
            markAsReadStore(id);
            queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.lists(),
            });
          } else if (type === 'notification.unread_count') {
            const { unreadCount } = payload as { unreadCount: number };
            setServerUnreadCount(unreadCount);
            queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.unreadCount(),
            });
          } else if (type === 'payment.updated') {
            const { dossierId } = payload as { dossierId?: string };
            if (dossierId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.payments.financeSummary(dossierId),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.payments.dossierPayments(dossierId),
              });
            }
          }
        } catch (err) {
          console.error('Lỗi phân giải SSE Notification:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        // Full Jitter Exponential Backoff (tối đa 5 lần)
        const nextAttempt = attemptRef.current + 1;
        attemptRef.current = nextAttempt;

        if (nextAttempt > 5) {
          setNotificationsStatus('reconnect_failed');
          return;
        }

        setNotificationsStatus('reconnecting');

        // Khi tab đang ẩn: tạm hoãn retry để tiết kiệm tài nguyên
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        const delay = calculateBackoffWithJitter(nextAttempt);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          connectRef.current();
        }, delay);
      };
    } catch {
      setNotificationsStatus('reconnecting');
    }
  }, [
    queryClient,
    router,
    syncSingleBackendNotification,
    setServerUnreadCount,
    markAsReadStore,
    setNotificationsStatus,
    enabled,
    notification,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    connect();

    const handleOnline = () => {
      attemptRef.current = 0;
      setNotificationsStatus('reconnecting');
      connect();
    };

    const handleOffline = () => {
      setNotificationsStatus('offline');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    // Page Visibility API: Quản lý vòng đời kết nối khi người dùng ẩn/hiện tab
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        if (!eventSourceRef.current) {
          attemptRef.current = 0;
          setNotificationsStatus('reconnecting');
          connect();
        } else {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
        }
      } else {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setNotificationsStatus('connected');
    };
  }, [connect, authAccessToken, tokenTrigger, enabled, queryClient, setNotificationsStatus]);

  return null;
}

/**
 * Hook lấy danh sách thông báo phân trang (TanStack Query)
 */
export function useNotificationsQuery(
  queryDto: NotificationQuery = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.notifications.list(queryDto),
    queryFn: ({ signal }) =>
      notificationsService.getNotifications(queryDto, { signal }),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook lấy số lượng thông báo chưa đọc
 */
export function useUnreadNotificationsCountQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) => notificationsService.getUnreadCount({ signal }),
    enabled: options?.enabled ?? true,
    refetchInterval: 60000, // Định kỳ 60s thăm dò dự phòng
  });
}

/**
 * Hook đánh dấu 1 thông báo là đã đọc
 */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const markAsReadStore = useNotificationStore((state) => state.markAsRead);

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: (updated) => {
      markAsReadStore(updated.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}

/**
 * Hook đánh dấu tất cả thông báo là đã đọc
 */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const markAllAsReadStore = useNotificationStore(
    (state) => state.markAllAsRead,
  );

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      markAllAsReadStore();
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}
