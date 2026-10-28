'use client';

import React from 'react';
import { Tabs, Card } from 'antd';
import { TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';
import { useRbacStore } from './store';
import { useDebounce } from '@/hooks/use-debounce';
import { useUsersList, useUserRoles } from '@/hooks/use-users';
import UserSummaryCards from './components/UserSummaryCards';
import UserTableSection from './components/UserTableSection';
import RoleTableSection from './components/RoleTableSection';
import RoleModal from './components/RoleModal';
import PermissionMatrixModal from './components/PermissionMatrixModal';
import UserRoleModal from './components/UserRoleModal';
import UserModal from './components/UserModal';
import UserDetailDrawer from './components/UserDetailDrawer';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { queryKeys } from '@/lib/query-keys';

export default function UsersAndRbacPage() {
  const {
    activeTab,
    setActiveTab,
    userSearch,
    userStatusFilter,
    userRoleFilter,
    userPage,
    userPageSize,
    roleSearch,
  } = useRbacStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      userSearch: s.userSearch,
      userStatusFilter: s.userStatusFilter,
      userRoleFilter: s.userRoleFilter,
      userPage: s.userPage,
      userPageSize: s.userPageSize,
      roleSearch: s.roleSearch,
    })),
  );

  const debouncedUserSearch = useDebounce(userSearch, 350);
  const debouncedRoleSearch = useDebounce(roleSearch, 350);
  const isSuperAdmin = useAuthStore((s) => Boolean(s.user?.roles?.includes('SUPER_ADMIN')));

  // 1. Fetch Paginated & Filtered Users via Deep Hook (API-USERS-001)
  const {
    users,
    total: totalUsers,
    isLoading: isUsersLoading,
  } = useUsersList({
    page: userPage,
    pageSize: userPageSize,
    search: debouncedUserSearch || undefined,
    status: userStatusFilter || undefined,
    roleId: userRoleFilter || undefined,
  }, { enabled: !isSuperAdmin });
  const ceoUsersQuery = useQuery({
    queryKey: [...queryKeys.users.all, 'ceos', userPage, userPageSize, debouncedUserSearch, userStatusFilter],
    queryFn: ({ signal }) => usersService.getCeoUsers({
      page: userPage,
      pageSize: userPageSize,
      search: debouncedUserSearch || undefined,
      status: userStatusFilter || undefined,
    }, { signal }),
    enabled: isSuperAdmin,
  });
  const visibleUsers = isSuperAdmin ? ceoUsersQuery.data?.data ?? [] : users;
  const visibleTotal = isSuperAdmin ? ceoUsersQuery.data?.meta.total ?? 0 : totalUsers;
  const usersLoading = isSuperAdmin ? ceoUsersQuery.isLoading : isUsersLoading;

  // Metric counts derived from users list
  const activeUsers = visibleUsers.filter((user) => user.status === 'ACTIVE').length;
  const lockedUsers = visibleUsers.filter((user) => user.status === 'LOCKED').length;
  const countRole = (code: string) =>
    visibleUsers.filter((user) => user.roles?.some((role) => role.code === code)).length;
  const ceoAdminUsers = visibleUsers.filter((user) =>
    user.roles?.some((role) => ['CEO_ADMIN', 'SUPER_ADMIN'].includes(role.code)),
  ).length;

  // 2. Fetch Roles for Filter and Roles Tab via Deep Hook
  const { data: rolesData, isLoading: isRolesLoading } = useUserRoles(
    debouncedRoleSearch,
  );
  const roles = rolesData || [];

  return (
    <div className="space-y-4">
      {/* Metric summary counters */}
      <UserSummaryCards
        totalUsers={visibleTotal}
        activeUsers={activeUsers}
        salesUsers={countRole('SALES')}
        operatorUsers={countRole('OPERATOR')}
        ceoAdminUsers={ceoAdminUsers}
        lockedUsers={lockedUsers}
        isLoading={usersLoading}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Main Tabbed Card */}
      <Card className="ceo-card" styles={{ body: { padding: '20px 24px' } }}>
        <Tabs
          activeKey={isSuperAdmin ? 'users' : activeTab}
          onChange={isSuperAdmin ? () => undefined : setActiveTab}
          items={[
            {
              key: 'users',
              label: (
                <span className="font-semibold text-sm flex items-center gap-2">
                  <TeamOutlined /> {isSuperAdmin ? 'CEO doanh nghiệp' : 'Danh sách Người dùng'} ({visibleTotal})
                </span>
              ),
              children: (
                <UserTableSection
                  users={visibleUsers}
                  totalUsers={visibleTotal}
                  roles={roles}
                  isLoading={usersLoading}
                  isSuperAdmin={isSuperAdmin}
                />
              ),
            },
            ...(!isSuperAdmin ? [{
              key: 'roles',
              label: (
                <span className="font-semibold text-sm flex items-center gap-2">
                  <SafetyCertificateOutlined /> Vai trò & Quyền hạn ({roles.length})
                </span>
              ),
              children: (
                <RoleTableSection roles={roles} isLoading={isRolesLoading} />
              ),
            }] : []),
          ]}
        />
      </Card>

      {/* Modals & Drawers */}
      <UserModal />
      <UserDetailDrawer />
      <RoleModal />
      <PermissionMatrixModal />
      <UserRoleModal />
    </div>
  );
}
