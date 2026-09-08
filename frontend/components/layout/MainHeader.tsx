'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Button, Space, Badge, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CalendarOutlined,
  BellOutlined,
  MessageOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  DownOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { authService } from '@/services/auth.service';
import type { UserContext } from '@/lib/routes.config';

const { Header } = Layout;

interface MainHeaderProps {
  routeMeta: { title: string; subtitle: string };
  userCtx: UserContext;
}

export function MainHeader({ routeMeta, userCtx }: MainHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setNotificationsDrawerOpen = useUIStore((state) => state.setNotificationsDrawerOpen);
  const connectionStatus = useUIStore((state) => state.connectionStatus);
  const reconnectAttempt = useUIStore((state) => state.reconnectAttempt);
  const triggerReconnect = useUIStore((state) => state.triggerReconnect);

  const serverUnreadCount = useNotificationStore((state) => state.serverUnreadCount);
  const notifications = useNotificationStore((state) => state.notifications);

  const unreadCount =
    serverUnreadCount !== null
      ? serverUnreadCount
      : notifications.filter((n) => !n.read).length;

  const { isCeoAdmin } = userCtx;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      logout();
      router.push('/auth/login');
    }
  };

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'profile-info',
      disabled: true,
      label: (
        <div className="py-1">
          <div className="font-semibold text-slate-800">
            {user?.fullName || 'Người dùng'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {user?.email || 'user@skylux.vn'}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            {user?.roles?.[0] || 'Member'}
          </div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      onClick: () => router.push('/main/profile'),
    },
    ...(isCeoAdmin || user?.permissions?.includes('user.manage') || user?.permissions?.includes('*')
      ? [
          {
            key: 'user-admin',
            icon: <TeamOutlined />,
            label: 'Quản trị người dùng',
            onClick: () => router.push('/main/users'),
          },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <Header
        className="skylux-app-header sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] px-7"
        style={{ height: 78, backgroundColor: '#FFFFFF' }}
      >
        <div className="flex flex-1 items-center gap-4">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            className="text-slate-600"
            aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
          />

          <div className="min-w-0">
            <h1 className="m-0 truncate text-[25px] font-bold leading-tight text-[var(--color-text)]">
              {routeMeta.title}
            </h1>
            <div className="mt-0.5 hidden truncate text-sm text-[var(--color-text-muted)] md:block">
              {routeMeta.subtitle}
            </div>
          </div>
        </div>

        <Space size={14}>
          {!isCeoAdmin && (
            <Button
              className="skylux-date-control hidden md:inline-flex"
              icon={<CalendarOutlined />}
              aria-label="Ngày hiện tại"
            >
              {new Intl.DateTimeFormat('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(new Date())}
            </Button>
          )}
          <Badge count={unreadCount} size="small" offset={[-2, 5]} color="var(--color-gold)">
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined className="text-lg text-slate-600" />}
              aria-label="Thông báo"
              onClick={() => setNotificationsDrawerOpen(true)}
            />
          </Badge>
          {isCeoAdmin && (
            <Button
              type="text"
              shape="circle"
              icon={<MessageOutlined className="text-lg text-slate-600" />}
              aria-label="Tin nhắn"
              onClick={() => router.push('/main/messages')}
            />
          )}

          <Dropdown
            menu={{ items: userDropdownItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <button className="flex cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-1 text-left transition-colors hover:bg-slate-100">
              <Avatar
                size={42}
                src={user?.avatarUrl}
                style={{ backgroundColor: '#EAF5EF', color: '#00543D' }}
                icon={<UserOutlined />}
              >
                {user?.fullName?.charAt(0)}
              </Avatar>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-semibold leading-tight text-slate-900">
                  {user?.fullName || 'Người dùng'}
                </span>
                <span className="text-xs leading-tight text-slate-500">
                  {user?.roles?.[0] || 'Điều hành'}
                </span>
              </div>
              <DownOutlined className="hidden text-xs text-slate-500 md:inline-block" />
            </button>
          </Dropdown>
        </Space>
      </Header>

      {connectionStatus !== 'connected' && (
        <div
          className={`flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-semibold tracking-wide transition-all ${
            connectionStatus === 'reconnecting'
              ? 'bg-amber-500 text-white shadow-sm'
              : connectionStatus === 'reconnect_failed'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-rose-600 text-white shadow-sm'
          }`}
        >
          {connectionStatus === 'reconnecting' && (
            <>
              <LoadingOutlined className="animate-spin text-sm" />
              <span>
                Đang kết nối lại hệ thống thời gian thực (lần thử #{reconnectAttempt}/5)...
              </span>
            </>
          )}
          {connectionStatus === 'reconnect_failed' && (
            <div className="flex items-center justify-center gap-3">
              <span>
                ⚠️ Không thể kết nối với máy chủ thời gian thực sau 5 lần thử.
              </span>
              <button
                type="button"
                onClick={triggerReconnect}
                className="inline-flex items-center gap-1 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 font-bold text-white transition-colors cursor-pointer border border-white/40"
              >
                <ReloadOutlined className="text-xs" /> Thử kết nối lại ngay
              </button>
            </div>
          )}
          {connectionStatus === 'offline' && (
            <span>
              ⚠️ Đã mất kết nối mạng. Hệ thống sẽ tự động kết nối lại khi có mạng.
            </span>
          )}
        </div>
      )}
    </>
  );
}

export default MainHeader;
