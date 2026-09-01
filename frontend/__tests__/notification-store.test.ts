import { useNotificationStore } from '../lib/stores/notification-store';

describe('useNotificationStore (Zustand Realtime Notification Store)', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
  });

  it('should initialize with empty notifications after clearAll', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.getUnreadCount()).toBe(0);
  });

  it('should add notifications and calculate unread count', () => {
    useNotificationStore.getState().addNotification({
      title: 'Hồ sơ mới',
      message: 'Hồ sơ tour Nhật Bản vừa được nộp.',
      type: 'info',
    });

    useNotificationStore.getState().addNotification({
      title: 'Dự toán được duyệt',
      message: 'Dự toán tour Phú Quốc đã được CEO duyệt.',
      type: 'success',
    });

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs.length).toBe(2);
    expect(useNotificationStore.getState().getUnreadCount()).toBe(2);
    expect(notifs[0].title).toBe('Dự toán được duyệt');
  });

  it('should mark notification as read and mark all as read', () => {
    useNotificationStore.getState().addNotification({
      id: 'notif-1',
      title: 'Cần bổ sung hồ sơ',
      message: 'Vui lòng bổ sung danh sách hành khách.',
      type: 'warning',
    });

    useNotificationStore.getState().addNotification({
      id: 'notif-2',
      title: 'Cảnh báo hạn chót',
      message: 'Còn 2 tiếng để xác nhận đặt phòng.',
      type: 'error',
    });

    expect(useNotificationStore.getState().getUnreadCount()).toBe(2);

    useNotificationStore.getState().markAsRead('notif-1');
    expect(useNotificationStore.getState().getUnreadCount()).toBe(1);

    useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().getUnreadCount()).toBe(0);
  });

  it('should remove notification by id', () => {
    useNotificationStore.getState().addNotification({
      id: 'notif-delete-me',
      title: 'Thông báo tạm',
      message: 'Test message',
      type: 'info',
    });

    expect(useNotificationStore.getState().notifications.length).toBe(1);
    useNotificationStore.getState().removeNotification('notif-delete-me');
    expect(useNotificationStore.getState().notifications.length).toBe(0);
  });
});
