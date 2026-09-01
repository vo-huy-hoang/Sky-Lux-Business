import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationState {
  notifications: AppNotification[];
  addNotification: (
    item: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { id?: string },
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: 'default-welcome-1',
          title: 'Chào mừng đến với Sky-Lux',
          message: 'Hệ thống điều hành tour và quản lý doanh thu cao cấp đã sẵn sàng.',
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],

      addNotification: (item) => {
        const newNotif: AppNotification = {
          id: item.id || generateId(),
          title: item.title,
          message: item.message,
          type: item.type || 'info',
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: item.actionUrl,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50),
        }));
      },

      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'skylux-notifications-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
