import { create } from 'zustand';
import { RoleItem, UserItem } from '@/services/rbac.service';

interface RbacState {
  // Active Tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Search
  userSearch: string;
  setUserSearch: (search: string) => void;
  roleSearch: string;
  setRoleSearch: (search: string) => void;

  // Role Modal
  isRoleModalOpen: boolean;
  editingRole: RoleItem | null;
  openCreateRole: () => void;
  openEditRole: (role: RoleItem) => void;
  closeRoleModal: () => void;

  // Permission Matrix Modal
  isPermModalOpen: boolean;
  selectedRoleForPerms: RoleItem | null;
  selectedPermCodes: string[];
  openPermMatrix: (role: RoleItem, initialCodes: string[]) => void;
  setSelectedPermCodes: (codes: string[] | ((prev: string[]) => string[])) => void;
  closePermModal: () => void;

  // User Role Assignment Modal
  isUserRoleModalOpen: boolean;
  selectedUserForRoles: UserItem | null;
  selectedUserRoleIds: string[];
  openUserRoles: (user: UserItem, initialRoleIds: string[]) => void;
  setSelectedUserRoleIds: (ids: string[]) => void;
  closeUserRoleModal: () => void;
}

export const useRbacStore = create<RbacState>((set) => ({
  // Active Tab
  activeTab: 'users',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Search
  userSearch: '',
  setUserSearch: (search) => set({ userSearch: search }),
  roleSearch: '',
  setRoleSearch: (search) => set({ roleSearch: search }),

  // Role Modal
  isRoleModalOpen: false,
  editingRole: null,
  openCreateRole: () => set({ isRoleModalOpen: true, editingRole: null }),
  openEditRole: (role) => set({ isRoleModalOpen: true, editingRole: role }),
  closeRoleModal: () => set({ isRoleModalOpen: false, editingRole: null }),

  // Permission Matrix Modal
  isPermModalOpen: false,
  selectedRoleForPerms: null,
  selectedPermCodes: [],
  openPermMatrix: (role, initialCodes) =>
    set({
      isPermModalOpen: true,
      selectedRoleForPerms: role,
      selectedPermCodes: initialCodes,
    }),
  setSelectedPermCodes: (codes) =>
    set((state) => ({
      selectedPermCodes: typeof codes === 'function' ? codes(state.selectedPermCodes) : codes,
    })),
  closePermModal: () =>
    set({
      isPermModalOpen: false,
      selectedRoleForPerms: null,
      selectedPermCodes: [],
    }),

  // User Role Assignment Modal
  isUserRoleModalOpen: false,
  selectedUserForRoles: null,
  selectedUserRoleIds: [],
  openUserRoles: (user, initialRoleIds) =>
    set({
      isUserRoleModalOpen: true,
      selectedUserForRoles: user,
      selectedUserRoleIds: initialRoleIds,
    }),
  setSelectedUserRoleIds: (ids) => set({ selectedUserRoleIds: ids }),
  closeUserRoleModal: () =>
    set({
      isUserRoleModalOpen: false,
      selectedUserForRoles: null,
      selectedUserRoleIds: [],
    }),
}));
