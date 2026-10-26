import { create } from 'zustand';
import { RoleItem } from '@/services/rbac.service';
import { UserItem, UserStatus } from '@/types/user';

interface RbacState {
  // Active Tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // User Filter & Pagination States
  userSearch: string;
  setUserSearch: (search: string) => void;
  userStatusFilter?: UserStatus | '';
  setUserStatusFilter: (status?: UserStatus | '') => void;
  userDepartmentFilter?: string;
  setUserDepartmentFilter: (deptId?: string) => void;
  userRoleFilter?: string;
  setUserRoleFilter: (roleId?: string) => void;
  userPage: number;
  setUserPage: (page: number) => void;
  userPageSize: number;
  setUserPageSize: (size: number) => void;

  // Role Search
  roleSearch: string;
  setRoleSearch: (search: string) => void;

  // User Modal (Create & Edit)
  isUserModalOpen: boolean;
  editingUser: UserItem | null;
  openCreateUser: () => void;
  openEditUser: (user: UserItem) => void;
  closeUserModal: () => void;

  // User Detail Drawer
  isUserDrawerOpen: boolean;
  selectedUserForDetail: UserItem | null;
  openUserDetail: (user: UserItem) => void;
  closeUserDetail: () => void;

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

  // User Filter & Pagination States
  userSearch: '',
  setUserSearch: (search) => set({ userSearch: search, userPage: 1 }),
  userStatusFilter: '',
  setUserStatusFilter: (status) => set({ userStatusFilter: status, userPage: 1 }),
  userDepartmentFilter: undefined,
  setUserDepartmentFilter: (deptId) => set({ userDepartmentFilter: deptId, userPage: 1 }),
  userRoleFilter: undefined,
  setUserRoleFilter: (roleId) => set({ userRoleFilter: roleId, userPage: 1 }),
  userPage: 1,
  setUserPage: (page) => set({ userPage: page }),
  userPageSize: 20,
  setUserPageSize: (size) => set({ userPageSize: size, userPage: 1 }),

  // Role Search
  roleSearch: '',
  setRoleSearch: (search) => set({ roleSearch: search }),

  // User Modal
  isUserModalOpen: false,
  editingUser: null,
  openCreateUser: () => set({ isUserModalOpen: true, editingUser: null }),
  openEditUser: (user) => set({ isUserModalOpen: true, editingUser: user }),
  closeUserModal: () => set({ isUserModalOpen: false, editingUser: null }),

  // User Detail Drawer
  isUserDrawerOpen: false,
  selectedUserForDetail: null,
  openUserDetail: (user) => set({ isUserDrawerOpen: true, selectedUserForDetail: user }),
  closeUserDetail: () => set({ isUserDrawerOpen: false, selectedUserForDetail: null }),

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
