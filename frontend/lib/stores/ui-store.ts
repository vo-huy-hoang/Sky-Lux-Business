import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SSEStreamStatus = 'connected' | 'reconnecting' | 'offline' | 'reconnect_failed';
export type ChatStreamStatus = 'idle' | SSEStreamStatus;

export function computeCombinedConnectionStatus(
  notificationsStatus: SSEStreamStatus,
  chatStatus: ChatStreamStatus,
): SSEStreamStatus {
  if (notificationsStatus === 'offline' || chatStatus === 'offline') {
    return 'offline';
  }
  if (notificationsStatus === 'reconnect_failed' || chatStatus === 'reconnect_failed') {
    return 'reconnect_failed';
  }
  if (notificationsStatus === 'reconnecting' || chatStatus === 'reconnecting') {
    return 'reconnecting';
  }
  return 'connected';
}

export interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notificationsDrawerOpen: boolean;
  setNotificationsDrawerOpen: (open: boolean) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  activeModalId: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  connectionStatus: SSEStreamStatus;
  setConnectionStatus: (status: SSEStreamStatus) => void;
  notificationsStatus: SSEStreamStatus;
  setNotificationsStatus: (status: SSEStreamStatus) => void;
  chatStatus: ChatStreamStatus;
  setChatStatus: (status: ChatStreamStatus) => void;
  reconnectAttempt: number;
  setReconnectAttempt: (attempt: number) => void;
  reconnectTrigger: number;
  triggerReconnect: () => void;
}


export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),
      notificationsDrawerOpen: false,
      setNotificationsDrawerOpen: (open: boolean) =>
        set({ notificationsDrawerOpen: open }),
      themeMode: 'light',
      setThemeMode: (mode: 'light' | 'dark') => set({ themeMode: mode }),
      activeModalId: null,
      openModal: (modalId: string) => set({ activeModalId: modalId }),
      closeModal: () => set({ activeModalId: null }),
      connectionStatus: 'connected',
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      notificationsStatus: 'connected',
      setNotificationsStatus: (status) =>
        set((state) => ({
          notificationsStatus: status,
          connectionStatus: computeCombinedConnectionStatus(status, state.chatStatus),
        })),
      chatStatus: 'idle',
      setChatStatus: (status) =>
        set((state) => ({
          chatStatus: status,
          connectionStatus: computeCombinedConnectionStatus(state.notificationsStatus, status),
        })),
      reconnectAttempt: 0,
      setReconnectAttempt: (attempt) => set({ reconnectAttempt: attempt }),
      reconnectTrigger: 0,
      triggerReconnect: () =>
        set((state) => ({
          reconnectTrigger: state.reconnectTrigger + 1,
          connectionStatus: 'reconnecting',
          reconnectAttempt: 0,
        })),
    }),
    {
      name: 'skylux-ui-storage',

      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        themeMode: state.themeMode,
      }),
    },
  ),
);
