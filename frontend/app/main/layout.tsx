'use client';

import React, { useMemo, useEffect } from 'react';
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

  // Kích hoạt lắng nghe luồng SSE thông báo thời gian thực
  useNotificationsRealtime({ enabled: hasHydrated });

  // Truy vấn danh sách thông báo và số lượng chưa đọc từ API
  const { data: notificationsData } = useNotificationsQuery(
    { limit: 50 },
    { enabled: hasHydrated },
  );
  const { data: unreadCountData } = useUnreadNotificationsCountQuery({
    enabled: hasHydrated,
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
        const timer = setTimeout(() => {
          useAuthStore.getState().setHasHydrated(true);
        }, 100);
        return () => {
          unsub?.();
          clearTimeout(timer);
        };
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
    if (typeof document !== 'undefined') {
      const pageTitle = routeMeta.title || 'Bảng điều khiển';
      const roleSuffix = isCeoAdmin ? 'SkyLux CEO' : isOperator ? 'SkyLux Điều Hành' : isSales ? 'SkyLux Sales' : 'SkyLux Travel';
      document.title = `${pageTitle} | ${roleSuffix}`;
    }
  }, [routeMeta.title, isCeoAdmin, isOperator, isSales]);

  return (
    <Layout
      hasSider
      className={`min-h-[100dvh] bg-[var(--color-bg)] ${isCeoAdmin ? 'ceo-shell' : ''} ${isOperator ? 'operator-shell' : ''}`}
    >
      <MainSidebar userCtx={userCtx} />

      <Layout>
        <MainHeader routeMeta={routeMeta} userCtx={userCtx} />

        <Content className="skylux-content-shell overflow-y-auto bg-[var(--color-bg)]">
          <div className="mx-auto max-w-[1540px]">
            {!hasHydrated ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
                <Spin size="large" />
                <span className="text-sm text-[var(--color-text-muted)]">
                  Đang khôi phục phiên đăng nhập...
                </span>
              </div>
            ) : isAccessible ? (
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
                      onClick={() => router.push('/main/dashboard')}
                      className="skylux-primary-button"
                    >
                      Quay về Bảng điều khiển
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </Content>

        <NotificationDrawer />
      </Layout>
    </Layout>
  );
}
