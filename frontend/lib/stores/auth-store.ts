import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { UserProfile, LoginResponse } from '@/types/auth';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  lockoutSeconds: number;
  setHasHydrated: (hasHydrated: boolean) => void;
  setLockoutSeconds: (seconds: number) => void;
  decrementLockoutSeconds: () => void;
  setAuth: (data: LoginResponse) => void;
  restoreAuth: (user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      lockoutSeconds: 0,
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
      setLockoutSeconds: (seconds: number) => set({ lockoutSeconds: seconds }),
      decrementLockoutSeconds: () =>
        set((state) => ({ lockoutSeconds: Math.max(0, state.lockoutSeconds - 1) })),

      setAuth: (data: LoginResponse) => {
        const { user } = data;
        set({
          user,
          isAuthenticated: true,
          // A successful login is already an authoritative auth state. Do not
          // keep the protected layout waiting for a persist rehydrate event.
          hasHydrated: true,
        });
      },

      restoreAuth: (user: UserProfile) => {
        set({
          user,
          isAuthenticated: true,
          hasHydrated: true,
        });
      },

      setUser: (user: UserProfile) => {
        set({ user });
      },

      logout: () => {
        Cookies.remove('csrf_token', { path: '/' });
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user || !user.permissions) return false;
        if (
          user.permissions.includes('*') ||
          user.roles.includes('SUPER_ADMIN') ||
          user.roles.includes('CEO_ADMIN')
        ) {
          return true;
        }
        return user.permissions.includes(permission);
      },

      hasRole: (role: string | string[]) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        if (user.roles.includes('SUPER_ADMIN')) return true;
        if (Array.isArray(role)) {
          return role.some((r) => user.roles.includes(r));
        }
        return user.roles.includes(role);
      },

      isSuperAdmin: () => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return (
          user.roles.includes('SUPER_ADMIN') || user.roles.includes('CEO_ADMIN')
        );
      },
    }),
    {
      name: 'skylux-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist only non-sensitive profile & UI metadata; JWTs live in HttpOnly cookies.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lockoutSeconds: state.lockoutSeconds,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHasHydrated(true);
      },
    },
  ),
);
