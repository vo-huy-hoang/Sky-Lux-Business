import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NotificationItem } from '@/types/notification';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationState {
  notifications: AppNotification[];
  serverUnreadCount: number | null;
  addNotification: (
    item: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { id?: string },
  ) => void;
  setNotifications: (items: AppNotification[]) => void;
  syncBackendNotifications: (items: NotificationItem[]) => void;
  syncSingleBackendNotification: (item: NotificationItem) => void;
  setServerUnreadCount: (count: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function mapBackendType(type?: string): 'info' | 'success' | 'warning' | 'error' {
  switch (type?.toUpperCase()) {
    case 'APPROVE':
    case 'APPROVED':
    case 'SUCCESS':
      return 'success';
    case 'WARNING':
    case 'REQUEST_CHANGES':
    case 'NEED_CHANGES':
      return 'warning';
    case 'ERROR':
    case 'REJECT':
      return 'error';
    case 'DOSSIER':
    case 'ESTIMATE':
    case 'TASK':
    case 'SYSTEM':
    case 'CHAT':
    default:
      return 'info';
  }
}

export function mapBackendToAppNotification(item: NotificationItem): AppNotification {
  return {
    id: item.id,
    title: item.title,
    message: item.content,
    type: mapBackendType(item.type),
    read: item.isRead,
    createdAt: item.createdAt,
    actionUrl: item.linkUrl,
    metadata: item.metadata,
  };
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Khởi tạo hoàn toàn rỗng, dữ liệu sẽ được đồng bộ từ backend
      notifications: [],
      serverUnreadCount: null,

      addNotification: (item) => {
        const newNotif: AppNotification = {
          id: item.id || generateId(),
          title: item.title,
          message: item.message,
          type: item.type || 'info',
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: item.actionUrl,
          metadata: item.metadata,
        };
        set((state) => ({
          notifications: [
            newNotif,
            ...state.notifications.filter((n) => n.id !== newNotif.id),
          ].slice(0, 50),
          serverUnreadCount:
            state.serverUnreadCount !== null ? state.serverUnreadCount + 1 : null,
        }));
      },

      setNotifications: (items: AppNotification[]) => {
        set({ notifications: items.slice(0, 50) });
      },

      syncBackendNotifications: (items: NotificationItem[]) => {
        const mapped = items.map(mapBackendToAppNotification);
        set({ notifications: mapped.slice(0, 50) });
      },

      syncSingleBackendNotification: (item: NotificationItem) => {
        const mapped = mapBackendToAppNotification(item);
        set((state) => ({
          notifications: [
            mapped,
            ...state.notifications.filter((n) => n.id !== mapped.id),
          ].slice(0, 50),
          serverUnreadCount:
            state.serverUnreadCount !== null && !mapped.read
              ? state.serverUnreadCount + 1
              : state.serverUnreadCount,
        }));
      },

      setServerUnreadCount: (count: number) => {
        set({ serverUnreadCount: count });
      },

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          serverUnreadCount:
            state.serverUnreadCount !== null
              ? Math.max(0, state.serverUnreadCount - 1)
              : null,
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          serverUnreadCount: 0,
        }));
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAll: () => {
        set({ notifications: [], serverUnreadCount: null });
      },

      getUnreadCount: () => {
        const state = get();
        if (state.serverUnreadCount !== null) {
          return state.serverUnreadCount;
        }
        return state.notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'skylux-notifications-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // Tự động dọn dữ liệu cũ từng lưu trong localStorage của trình duyệt
        if (!version || version < 2) {
          return {
            notifications: [],
            serverUnreadCount: null,
          };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
