import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useNotificationsQuery,
  useUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/hooks/useNotificationsRealtime';
import { notificationsService } from '@/services/notifications.service';
import { NotificationItem } from '@/types/notification';

jest.mock('@/services/notifications.service', () => ({
  notificationsService: {
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    getNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useNotifications hooks', () => {
  const notifId = 'notif-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNotifItem: NotificationItem = {
    id: notifId,
    organizationId: 'org-uuid-1',
    userId: 'user-uuid-1',
    title: 'Nhiệm vụ mới',
    content: 'Bạn đã được giao nhiệm vụ mới',
    type: 'TASK',
    isRead: false,
    linkUrl: '/tasks',
    createdAt: '2026-09-04T11:00:00.000Z',
    updatedAt: '2026-09-04T11:00:00.000Z',
  };

  it('useNotificationsQuery fetches paginated notifications', async () => {
    const mockResponse = {
      items: [mockNotifItem],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    };
    (notificationsService.getNotifications as jest.Mock).mockResolvedValueOnce(
      mockResponse,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useNotificationsQuery({ limit: 20 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse);
    expect(notificationsService.getNotifications).toHaveBeenCalledWith(
      { limit: 20 },
      { signal: expect.anything() },
    );
  });

  it('useUnreadNotificationsCountQuery fetches unread count', async () => {
    const mockCount = { unreadCount: 7 };
    (notificationsService.getUnreadCount as jest.Mock).mockResolvedValueOnce(
      mockCount,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useUnreadNotificationsCountQuery(),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCount);
    expect(notificationsService.getUnreadCount).toHaveBeenCalledWith({
      signal: expect.anything(),
    });
  });

  it('useMarkNotificationReadMutation marks single notification as read', async () => {
    const updated = { ...mockNotifItem, isRead: true };
    (notificationsService.markAsRead as jest.Mock).mockResolvedValueOnce(updated);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMarkNotificationReadMutation(),
      { wrapper: Wrapper },
    );

    result.current.mutate(notifId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAsRead).toHaveBeenCalledWith(notifId);
  });

  it('useMarkAllNotificationsReadMutation marks all notifications as read', async () => {
    (notificationsService.markAllAsRead as jest.Mock).mockResolvedValueOnce({
      updatedCount: 5,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMarkAllNotificationsReadMutation(),
      { wrapper: Wrapper },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAllAsRead).toHaveBeenCalled();
  });
});
