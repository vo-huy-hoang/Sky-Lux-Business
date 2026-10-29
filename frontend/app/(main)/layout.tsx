'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Button, Result, Spin } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
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

  // Zustand restores the role from localStorage, which is unavailable during
  // server rendering. Keep the server and first client render role-neutral,
  // then choose a shell only after the browser has mounted and auth is ready.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const authReady = hasMounted && hasHydrated;

  // Do not leave a protected route on the restore spinner forever if persisted
  // browser state is unavailable or corrupted. Fail closed and let the user
  // sign in again; the original destination is restored after login.
  useEffect(() => {
    if (!hasMounted || hasHydrated) return;

    const timeout = window.setTimeout(() => setAuthRestoreTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [hasMounted, hasHydrated]);

  useEffect(() => {
    if (!hasMounted || hasHydrated || !authRestoreTimedOut) return;

    useAuthStore.getState().logout();
    const loginUrl = new URL('/login', window.location.origin);
    if (pathname) loginUrl.searchParams.set('redirect', pathname);
    window.location.replace(loginUrl.toString());
  }, [authRestoreTimedOut, hasMounted, hasHydrated, pathname]);

  // Kích hoạt lắng nghe luồng SSE thông báo thời gian thực
  useNotificationsRealtime({ enabled: authReady });

  // Truy vấn danh sách thông báo và số lượng chưa đọc từ API
  const { data: notificationsData } = useNotificationsQuery(
    { limit: 50 },
    { enabled: authReady },
  );
  const { data: unreadCountData } = useUnreadNotificationsCountQuery({
    enabled: authReady,
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
