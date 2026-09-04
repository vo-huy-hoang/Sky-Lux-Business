'use client';

import React, { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Button, Result } from 'antd';
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

  // Kích hoạt lắng nghe luồng SSE thông báo thời gian thực
  useNotificationsRealtime();

  // Truy vấn danh sách thông báo và số lượng chưa đọc từ API
  const { data: notificationsData } = useNotificationsQuery({ limit: 50 });
  const { data: unreadCountData } = useUnreadNotificationsCountQuery();

  const syncBackendNotifications = useNotificationStore(
    (state) => state.syncBackendNotifications,
  );
  const setServerUnreadCount = useNotificationStore(
    (state) => state.setServerUnreadCount,
  );

  // Đồng bộ dữ liệu ban đầu / khi refetch từ Server vào Zustand Store
  useEffect(() => {
    if (notificationsData?.items) {
      syncBackendNotifications(notificationsData.items);
    }
  }, [notificationsData, syncBackendNotifications]);

  useEffect(() => {
    if (typeof unreadCountData?.unreadCount === 'number') {
      setServerUnreadCount(unreadCountData.unreadCount);
    }
  }, [unreadCountData, setServerUnreadCount]);

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
    [user, isOperator, isSales, isCeoAdmin, isSuperAdmin],
  );

  const routeMeta = useMemo(() => {
    return getRouteMeta(pathname, userCtx);
  }, [pathname, userCtx]);

  const isAccessible = useMemo(() => {
    return isPathAccessible(pathname, userCtx);
  }, [pathname, userCtx]);

  return (
    <Layout
      className={`min-h-[100dvh] bg-[var(--color-bg)] ${isCeoAdmin ? 'ceo-shell' : ''} ${isOperator ? 'operator-shell' : ''}`}
    >
      <MainSidebar userCtx={userCtx} />

      <Layout>
        <MainHeader routeMeta={routeMeta} userCtx={userCtx} />

        <Content className="skylux-content-shell overflow-y-auto bg-[var(--color-bg)]">
          <div className="mx-auto max-w-[1540px]">
            {isAccessible ? (
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
