'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Badge,
  Button,
  Input,
} from 'antd';
import {
  DashboardOutlined,
  FolderOpenOutlined,
  UsergroupAddOutlined,
  FileExcelOutlined,
  CheckSquareOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  SearchOutlined,
  DownOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Header, Sider, Content } = Layout;

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  const [failed, setFailed] = useState(false);

  if (collapsed) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#D6A51F]/70 text-sm font-bold text-[#F0C020]">
        SL
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {!failed ? (
        <Image
          src="/logo/logo.png"
          alt="SkyLux Travel"
          width={178}
          height={148}
          className="h-[116px] w-[138px] object-contain"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <div className="flex h-[116px] w-[138px] items-center justify-center rounded-full border border-[#D6A51F]/70 text-center text-[#F0C020]">
          <div>
            <div className="text-xl font-bold leading-none">SKYLUX</div>
            <div className="mt-1 text-[10px] font-semibold">TRAVEL</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/main/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/main/dashboard">Bảng điều khiển</Link>,
    },
    {
      key: '/main/dossiers',
      icon: <FolderOpenOutlined />,
      label: <Link href="/main/dossiers">Hồ sơ của tôi</Link>,
    },
    {
      key: '/main/imports',
      icon: <FileExcelOutlined />,
      label: <Link href="/main/imports">Import dự toán Excel</Link>,
    },
    {
      key: '/main/customers',
      icon: <UsergroupAddOutlined />,
      label: <Link href="/main/customers">Khách hàng của tôi</Link>,
    },
    {
      key: '/main/tasks',
      icon: <CheckSquareOutlined />,
      label: <Link href="/main/tasks">Công việc của tôi</Link>,
    },
    {
      key: '/main/messages',
      icon: <MessageOutlined />,
      label: <Link href="/main/messages">Tin nhắn</Link>,
    },
    {
      key: '/main/profile',
      icon: <UserOutlined />,
      label: <Link href="/main/profile">Hồ sơ cá nhân</Link>,
    },
  ];

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
    ...(user?.roles?.some((role) => ['SUPER_ADMIN', 'CEO_ADMIN'].includes(role))
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

  // Determine active menu key
  const selectedKey = pathname?.startsWith('/main/profile')
    ? '/main/profile'
    : pathname?.startsWith('/main/tasks')
    ? '/main/tasks'
    : pathname?.startsWith('/main/messages')
    ? '/main/messages'
    : pathname?.startsWith('/main/dossiers')
    ? '/main/dossiers'
    : pathname?.startsWith('/main/customers')
    ? '/main/customers'
    : pathname || '/main/dashboard';

  return (
    <Layout className="min-h-[100dvh] bg-[var(--color-bg)]">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={228}
        collapsedWidth={isMobile ? 0 : 72}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          setCollapsed(broken);
        }}
        theme="dark"
        className="skylux-sidebar"
        style={{
          overflow: 'auto',
          height: '100dvh',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          zIndex: isMobile ? 40 : undefined,
          backgroundColor: '#003F31',
        }}
      >
        <div className="px-4 pb-4 pt-4">
          <BrandLogo collapsed={collapsed} />
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="skylux-side-menu border-r-0 px-3 font-semibold"
          style={{ background: 'transparent' }}
        />

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-7">
          <div className="border-t border-white/10 pt-6 text-[#D6A51F]">
            <div className="flex items-center gap-3">
              <CustomerServiceOutlined className="text-lg text-white" />
              {!collapsed && (
                <div>
                  <div className="text-sm">Cần hỗ trợ?</div>
                  <div className="mt-1 text-sm font-semibold text-[#D6A51F]">
                    1900 6688
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header
          className="skylux-app-header sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] px-7"
          style={{ height: 68, backgroundColor: '#FFFFFF' }}
        >
          <div className="flex flex-1 items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-600"
              aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
            />
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm kiếm hồ sơ, khách hàng, công việc..."
              suffix={<span className="text-xs font-medium text-slate-400">⌘ K</span>}
              className="hidden h-11 max-w-[560px] rounded-lg md:flex"
              aria-label="Tìm kiếm toàn hệ thống"
            />
          </div>

          <Space size={16}>
            <Badge
              count={5}
              size="small"
              offset={[-2, 4]}
              color="var(--color-gold)"
            >
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined className="text-lg text-slate-600" />}
                aria-label="Thông báo"
              />
            </Badge>

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
                    {user?.fullName || 'Nguyễn Thu Hà'}
                  </span>
                  <span className="text-xs leading-tight text-slate-500">
                    {user?.roles?.[0] || 'Sales'}
                  </span>
                </div>
                <DownOutlined className="hidden text-xs text-slate-500 md:inline-block" />
              </button>
            </Dropdown>
          </Space>
        </Header>

        <Content className="overflow-y-auto bg-[var(--color-bg)] px-7 py-6">
          <div className="mx-auto max-w-[1540px]">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
