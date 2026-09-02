import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  setConnectionStatus: (status: 'connected' | 'reconnecting' | 'offline') => void;
  reconnectAttempt: number;
  setReconnectAttempt: (attempt: number) => void;
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
      reconnectAttempt: 0,
      setReconnectAttempt: (attempt) => set({ reconnectAttempt: attempt }),
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
