'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Button, Result, Spin } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authService } from '@/services/auth.service';
import { useNotificationStore } from '@/lib/stores/notification-store';
import {
  useNotificationsRealtime,
  useNotificationsQuery,
  useUnreadNotificationsCountQuery,
} from '@/hooks/useNotificationsRealtime';
import {
  getRouteMeta,
  isPathAccessible,
  type UserContext,
} from '@/lib/routes.config';
import { MainSidebar } from '@/components/layout/MainSidebar';
import { MainHeader } from '@/components/layout/MainHeader';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { RealtimeConnectionIndicator } from '@/components/common/RealtimeConnectionIndicator';
import { SuperAdminWorkspace } from '@/components/super-admin/SuperAdminWorkspace';
import { ForceChangePasswordGate } from '@/components/auth/ForceChangePasswordGate';

const { Content } = Layout;

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [hasMounted, setHasMounted] = useState(false);
  const [authRestoreTimedOut, setAuthRestoreTimedOut] = useState(false);
  const [authRestoreError, setAuthRestoreError] = useState(false);
  const [authRestoreRetryKey, setAuthRestoreRetryKey] = useState(0);

  // Zustand restores the role from localStorage, which is unavailable during
  // server rendering. Keep the server and first client render role-neutral,
  // then choose a shell only after the browser has mounted and auth is ready.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const authReady = hasMounted && hasHydrated && Boolean(user);
  const mustChangePassword = Boolean(user?.mustChangePassword);

  // Do not leave a protected route on the restore spinner forever if persisted
  // browser state is unavailable or corrupted. Fail closed and let the user
  // sign in again; the original destination is restored after login.
  useEffect(() => {
    if (!hasMounted || hasHydrated) return;

    const timeout = window.setTimeout(() => setAuthRestoreTimedOut(true), 1500);
    return () => window.clearTimeout(timeout);
  }, [hasMounted, hasHydrated, authRestoreRetryKey]);

  useEffect(() => {
    if (!hasMounted || (hasHydrated && user)) return;
    if (!hasHydrated && !authRestoreTimedOut) return;

    let active = true;

    const restoreSession = async () => {
      try {
        // Browser attaches HttpOnly access_token cookie automatically via withCredentials.
        const profile = await authService.getMe();
        if (!active) return;

        useAuthStore.getState().restoreAuth({
          id: profile.id,
          organizationId: profile.organizationId,
          organizationName: profile.organization?.name,
          departmentId: profile.departmentId,
          departmentName: profile.department?.name,
          employeeCode: profile.employeeCode,
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
          roles: profile.roles.map((role) => role.code),
          permissions: profile.permissions,
          mustChangePassword: Boolean(profile.mustChangePassword),
        });
      } catch (error: any) {
        if (!active) return;

        if (error?.status === 401) {
          redirectToLogin();
          return;
        }

        // Keep cookies intact on transient network/API errors so the user
        // can retry without entering their credentials again.
        setAuthRestoreError(true);
      }
    };

    const redirectToLogin = () => {
      useAuthStore.getState().logout();
      const loginUrl = new URL('/login', window.location.origin);
      if (pathname) loginUrl.searchParams.set('redirect', pathname);
      window.location.replace(loginUrl.toString());
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, [authRestoreTimedOut, hasMounted, hasHydrated, pathname, user]);

  useEffect(() => {
    const handlePasswordChangeRequired = () => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser && !currentUser.mustChangePassword) {
        useAuthStore.getState().setUser({
          ...currentUser,
          mustChangePassword: true,
        });
      }
    };

    window.addEventListener(
      'skylux:password-change-required',
      handlePasswordChangeRequired,
    );
    return () => {
      window.removeEventListener(
        'skylux:password-change-required',
        handlePasswordChangeRequired,
      );
    };
  }, []);

  // Kích hoạt lắng nghe luồng SSE thông báo thời gian thực
  useNotificationsRealtime({ enabled: authReady && !mustChangePassword });

  // Truy vấn danh sách thông báo và số lượng chưa đọc từ API
  const { data: notificationsData } = useNotificationsQuery(
    { limit: 50 },
    { enabled: authReady && !mustChangePassword },
  );
  const { data: unreadCountData } = useUnreadNotificationsCountQuery({
    enabled: authReady && !mustChangePassword,
  });

  const syncBackendNotifications = useNotificationStore(
    (state) => state.syncBackendNotifications,
  );
  const setServerUnreadCount = useNotificationStore(
    (state) => state.setServerUnreadCount,
  );

  // Đồng bộ dữ liệu ban đầu / khi refetch từ Server vào Zustand Store
  useEffect(() => {
    if (notificationsData?.data) {
      syncBackendNotifications(notificationsData.data);
    }
  }, [notificationsData, syncBackendNotifications]);

  useEffect(() => {
    if (typeof unreadCountData?.unreadCount === 'number') {
      setServerUnreadCount(unreadCountData.unreadCount);
    }
  }, [unreadCountData, setServerUnreadCount]);

  // Đảm bảo trạng thái đã hydrate sau khi client mount
  useEffect(() => {
    if (!hasHydrated) {
      if (useAuthStore.persist?.hasHydrated?.()) {
        useAuthStore.getState().setHasHydrated(true);
      } else {
        const unsub = useAuthStore.persist?.onFinishHydration?.(() => {
          useAuthStore.getState().setHasHydrated(true);
        });
        return () => unsub?.();
      }
    }
  }, [hasHydrated]);

  const isOperator = user?.roles?.includes('OPERATOR');
  const isSales = user?.roles?.includes('SALES');
  const isCeoAdmin = user?.roles?.some((role) => ['SUPER_ADMIN', 'CEO_ADMIN'].includes(role));
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

  const userCtx: UserContext = useMemo(
    () => ({
      roles: user?.roles,
      permissions: user?.permissions,
      isOperator,
      isSales,
      isCeoAdmin,
      isSuperAdmin,
    }),
    [user?.roles, user?.permissions, isOperator, isSales, isCeoAdmin, isSuperAdmin],
  );

  const routeMeta = useMemo(() => {
    return getRouteMeta(pathname, userCtx);
  }, [pathname, userCtx]);

  const isAccessible = useMemo(() => {
    return isPathAccessible(pathname, userCtx);
  }, [pathname, userCtx]);

  useEffect(() => {
    if (!authReady) return;

    if (typeof document !== 'undefined') {
      const pageTitle = routeMeta.title || 'Bảng điều khiển';
      const roleSuffix = isSuperAdmin ? 'SkyLux Super Admin' : isCeoAdmin ? 'SkyLux CEO' : isOperator ? 'SkyLux Điều Hành' : isSales ? 'SkyLux Sales' : 'SkyLux Travel';
      document.title = `${pageTitle} | ${roleSuffix}`;
    }
  }, [authReady, routeMeta.title, isCeoAdmin, isSuperAdmin, isOperator, isSales]);

  const pageContent = isAccessible ? (
    children
  ) : (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Result
        status="403"
        title="Không có quyền truy cập"
        subTitle="Bạn không có quyền truy cập vào tính năng này với vai trò hiện tại."
        extra={
          <Button
            type="primary"
            onClick={() => router.push('/dashboard')}
            className="skylux-primary-button"
          >
            Quay về Bảng điều khiển
          </Button>
        }
      />
    </div>
  );

  if (!authReady) {
    if (authRestoreError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-bg)] p-6">
          <Result
            status="error"
            title="Chưa thể khôi phục phiên đăng nhập"
            subTitle="Vui lòng kiểm tra kết nối mạng rồi thử lại. Phiên đăng nhập hiện tại vẫn được giữ lại."
            extra={
              <Button
                type="primary"
                onClick={() => {
                  setAuthRestoreError(false);
                  setAuthRestoreTimedOut(false);
                  setAuthRestoreRetryKey((key) => key + 1);
                }}
              >
                Thử lại
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-bg)]"
        role="status"
        aria-busy="true"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <Spin />
          <span>Đang khôi phục phiên đăng nhập...</span>
        </div>
      </div>
    );
  }

  if (mustChangePassword && user) {
    return <ForceChangePasswordGate user={user} />;
  }

  if (isSuperAdmin) {
    return (
      <>
        <SuperAdminWorkspace routeMeta={routeMeta} userCtx={userCtx}>
          {pageContent}
        </SuperAdminWorkspace>
        <NotificationDrawer />
        <RealtimeConnectionIndicator />
      </>
    );
  }

  return (
    <Layout
      hasSider
      className={`min-h-[100dvh] bg-[var(--color-bg)] ${isCeoAdmin ? 'ceo-shell' : ''} ${isOperator ? 'operator-shell' : ''}`}
    >
      <MainSidebar userCtx={userCtx} />
      <Layout>
        <MainHeader routeMeta={routeMeta} userCtx={userCtx} />
        <Content className="skylux-content-shell overflow-y-auto bg-[var(--color-bg)]">
          <div className="mx-auto max-w-[1540px]">{pageContent}</div>
        </Content>
      </Layout>
      <NotificationDrawer />
      <RealtimeConnectionIndicator />
    </Layout>
  );
}
