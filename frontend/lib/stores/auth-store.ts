import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { UserProfile, LoginResponse } from '@/types/auth';
import {
  hasPermission as policyHasPermission,
  isPlatformSuperAdmin,
  isExecutiveAdmin,
  isOperator,
  isSales,
  isAccountant,
  isCeoAdmin,
  hasExactRole,
  canApproveDossier,
  canManageUsers,
  canAccessFinancialHub,
  canManageOrganizations,
  canManageRoles,
  canExportReports,
  canManageCustomers,
  canViewCustomers,
  canManageSuppliers,
  canViewSuppliers,
  canManageTasks,
  canViewTasks,
  canManageDossiers,
  canViewDossiers,
} from '@/lib/authorization-policy';

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

  // Semantic capabilities (Expand step)
  isPlatformSuperAdmin: () => boolean;
  isExecutiveAdmin: () => boolean;
  isOperator: () => boolean;
  isSales: () => boolean;
  isAccountant: () => boolean;
  isCeoAdmin: () => boolean;
  hasExactRole: (role: string | string[]) => boolean;
  canApproveDossier: () => boolean;
  canManageUsers: () => boolean;
  canAccessFinancialHub: () => boolean;
  canManageOrganizations: () => boolean;
  canManageRoles: () => boolean;
  canExportReports: () => boolean;
  canManageCustomers: () => boolean;
  canViewCustomers: () => boolean;
  canManageSuppliers: () => boolean;
  canViewSuppliers: () => boolean;
  canManageTasks: () => boolean;
  canViewTasks: () => boolean;
  canManageDossiers: () => boolean;
  canViewDossiers: () => boolean;
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
          user.roles?.includes('SUPER_ADMIN') ||
          user.roles?.includes('CEO_ADMIN')
        ) {
          return true;
        }
        return policyHasPermission(user.permissions, permission);
      },

      hasRole: (role: string | string[]) => {
        return hasExactRole(get().user, role);
      },

      isSuperAdmin: () => {
        return isPlatformSuperAdmin(get().user);
      },

      // Semantic capability implementations
      isPlatformSuperAdmin: () => isPlatformSuperAdmin(get().user),
      isExecutiveAdmin: () => isExecutiveAdmin(get().user),
      isOperator: () => isOperator(get().user),
      isSales: () => isSales(get().user),
      isAccountant: () => isAccountant(get().user),
      isCeoAdmin: () => isCeoAdmin(get().user),
      hasExactRole: (role: string | string[]) => hasExactRole(get().user, role),
      canApproveDossier: () => canApproveDossier(get().user),
      canManageUsers: () => canManageUsers(get().user),
      canAccessFinancialHub: () => canAccessFinancialHub(get().user),
      canManageOrganizations: () => canManageOrganizations(get().user),
      canManageRoles: () => canManageRoles(get().user),
      canExportReports: () => canExportReports(get().user),
      canManageCustomers: () => canManageCustomers(get().user),
      canViewCustomers: () => canViewCustomers(get().user),
      canManageSuppliers: () => canManageSuppliers(get().user),
      canViewSuppliers: () => canViewSuppliers(get().user),
      canManageTasks: () => canManageTasks(get().user),
      canViewTasks: () => canViewTasks(get().user),
      canManageDossiers: () => canManageDossiers(get().user),
      canViewDossiers: () => canViewDossiers(get().user),
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
