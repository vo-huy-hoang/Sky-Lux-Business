import { apiClient } from '@/lib/api-client';
import { notificationsService } from '@/services/notifications.service';
import { NotificationItem, NotificationQuery } from '@/types/notification';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('NotificationsService (Frontend)', () => {
  const notifId = 'notif-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNotifItem: NotificationItem = {
    id: notifId,
    organizationId: 'org-uuid-1',
    userId: 'user-uuid-1',
    title: 'Hồ sơ mới cần duyệt',
    content: 'Sales đã nộp hồ sơ HS-001',
    type: 'DOSSIER',
    isRead: false,
    linkUrl: '/dossiers/hs-1',
    metadata: { dossierId: 'hs-1' },
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
  };

  it('API-NOTIF-001: getNotifications calls GET /notifications without params', async () => {
    const mockResponse = {
      items: [mockNotifItem],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await notificationsService.getNotifications();

    expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
      params: undefined,
      signal: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-NOTIF-001: getNotifications calls GET /notifications with query params', async () => {
    const mockResponse = {
      items: [mockNotifItem],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const params: NotificationQuery = {
      page: 1,
      limit: 10,
      isRead: false,
    };
    const result = await notificationsService.getNotifications(params);

    expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
      params,
      signal: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-NOTIF-002: getUnreadCount calls GET /notifications/unread-count', async () => {
    const mockCountResponse = { unreadCount: 5 };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockCountResponse);

    const result = await notificationsService.getUnreadCount();

    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count', {
      signal: undefined,
    });
    expect(result).toEqual(mockCountResponse);
  });

  it('API-NOTIF-003: getNotification calls GET /notifications/:id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockNotifItem);

    const result = await notificationsService.getNotification(notifId);

    expect(apiClient.get).toHaveBeenCalledWith(`/notifications/${notifId}`, {
      signal: undefined,
    });
    expect(result).toEqual(mockNotifItem);
  });

  it('API-NOTIF-004: markAsRead calls PATCH /notifications/:id/read', async () => {
    const readItem = { ...mockNotifItem, isRead: true };
    (apiClient.patch as jest.Mock).mockResolvedValueOnce(readItem);

    const result = await notificationsService.markAsRead(notifId);

    expect(apiClient.patch).toHaveBeenCalledWith(`/notifications/${notifId}/read`);
    expect(result).toEqual(readItem);
  });

  it('API-NOTIF-005: markAllAsRead calls PATCH /notifications/read-all', async () => {
    const mockUpdateResponse = { updatedCount: 3 };
    (apiClient.patch as jest.Mock).mockResolvedValueOnce(mockUpdateResponse);

    const result = await notificationsService.markAllAsRead();

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all');
    expect(result).toEqual(mockUpdateResponse);
  });

  it('API-NOTIF-006: deleteNotification calls DELETE /notifications/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce(undefined);

    await notificationsService.deleteNotification(notifId);

    expect(apiClient.delete).toHaveBeenCalledWith(`/notifications/${notifId}`);
  });
});
