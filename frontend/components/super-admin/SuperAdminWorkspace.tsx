'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  BarChartOutlined,
  BellOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Dropdown, Layout, Space } from 'antd';
import type { MenuProps } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { authService } from '@/services/auth.service';
import type { UserContext } from '@/lib/routes.config';
import styles from './super-admin.module.css';

const navigation = [
  { label: 'Tổng quan', path: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Doanh nghiệp', path: '/organizations', icon: <ShopOutlined /> },
  { label: 'Người dùng', path: '/users', icon: <TeamOutlined /> },
  { label: 'Thanh toán', path: '/revenue', icon: <CreditCardOutlined /> },
  { label: 'Báo cáo', path: '/reports', icon: <BarChartOutlined /> },
  { label: 'Cài đặt hệ thống', path: '/settings', icon: <SettingOutlined /> },
];

interface SuperAdminWorkspaceProps {
  children: ReactNode;
  routeMeta: { title: string; subtitle: string; icon?: ReactNode };
  userCtx: UserContext;
}

export function SuperAdminWorkspace({ children, routeMeta }: SuperAdminWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const setNotificationsDrawerOpen = useUIStore((state) => state.setNotificationsDrawerOpen);
  const serverUnreadCount = useNotificationStore((state) => state.serverUnreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = serverUnreadCount ?? notifications.filter((item) => !item.read).length;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Always clear the local session when the API cannot be reached.
    } finally {
      queryClient.clear();
      logout();
      // Start a fresh document so Next's App Router cannot reuse a cached
      // login payload from an older deployed build after logout.
      window.location.replace('/login');
    }
  };

  const accountMenu: MenuProps['items'] = [
    { key: 'profile', label: 'Hồ sơ cá nhân', onClick: () => router.push('/profile') },
    { type: 'divider' },
    { key: 'logout', label: 'Đăng xuất', danger: true, onClick: handleLogout },
  ];

  const isSelected = (path: string) =>
    path === '/dashboard' ? pathname === path : pathname?.startsWith(path);

  return (
    <div className={styles.workspace}>
      {mobileOpen && <button className={styles.scrim} aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.brand}>
          <Image src="/logo/logo.png?v=2" alt="Sky-Lux CRM" width={200} height={71} priority unoptimized className={styles.brandLogo} />
        </div>

        <nav className={styles.navigation} aria-label="Điều hướng quản trị">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.navItem} ${isSelected(item.path) ? styles.navItemActive : ''}`}
              aria-current={isSelected(item.path) ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              onClick={() => { router.push(item.path); setMobileOpen(false); }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.navItem} onClick={() => router.push('/messages')} title={collapsed ? 'Hỗ trợ' : undefined}>
            <span className={styles.navIcon}><CustomerServiceOutlined /></span>
            {!collapsed && <span>Hỗ trợ</span>}
          </button>
          <button type="button" className={styles.navItem} onClick={() => setCollapsed(!collapsed)}>
            <span className={styles.navIcon}>{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}</span>
            {!collapsed && <span>Thu gọn</span>}
          </button>
        </div>

        <div className={styles.account}>
          <Avatar size={38} src={user?.avatarUrl} className={styles.accountAvatar}>
            {user?.fullName?.charAt(0) || 'S'}
          </Avatar>
          {!collapsed && <div className={styles.accountCopy}><strong>{user?.fullName || 'Quản trị viên'}</strong><span>SUPER ADMIN</span></div>}
          {!collapsed && <Dropdown menu={{ items: accountMenu }} trigger={['click']} placement="topRight">
            <button className={styles.accountMore} aria-label="Tùy chọn tài khoản"><DownOutlined /></button>
          </Dropdown>}
        </div>
      </aside>

      <Layout className={styles.mainLayout}>
        <header className={styles.header}>
          <button className={styles.mobileMenuButton} onClick={() => setMobileOpen(true)} aria-label="Mở menu"><MenuUnfoldOutlined /></button>
          {pathname === '/dashboard' ? (
            <div className={styles.dashboardHeaderSpacer} aria-hidden="true" />
          ) : (
            <div className={styles.pageHeading}>
              <h1>{routeMeta.title}</h1>
              <p>{routeMeta.subtitle}</p>
            </div>
          )}
          <Space size={16} className={styles.headerActions}>
            <Badge count={unreadCount} size="small" color="#d4af37">
              <button className={styles.iconButton} aria-label="Thông báo" onClick={() => setNotificationsDrawerOpen(true)}><BellOutlined /></button>
            </Badge>
            <Dropdown menu={{ items: accountMenu }} trigger={['click']} placement="bottomRight">
              <button className={styles.headerAccount}>
                <Avatar size={36} src={user?.avatarUrl} className={styles.headerAvatar}>{user?.fullName?.charAt(0) || 'S'}</Avatar>
                <span className={styles.headerAccountName}>{user?.fullName || 'Quản trị viên'}</span>
                <DownOutlined className={styles.headerChevron} />
              </button>
            </Dropdown>
          </Space>
        </header>
        <main className={styles.content}>{children}</main>
      </Layout>
    </div>
  );
}

