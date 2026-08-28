'use client';

import React, { useMemo, useState } from 'react';
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
  DownOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  CalendarOutlined,
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
          width={180}
          height={180}
          className="h-[154px] w-[154px] object-contain"
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

  const isOperator = user?.roles?.includes('OPERATOR');
  const isSales = user?.roles?.includes('SALES');

  const routeMeta = useMemo(() => {
    if (pathname?.startsWith('/main/dossiers')) {
      return {
        title: isOperator ? 'Hồ sơ chờ xử lý' : 'Hồ sơ của tôi',
        subtitle: isOperator ? 'Danh sách hồ sơ và dự toán cần kiểm tra điều hành' : 'Danh sách và tiến độ các hồ sơ tour của bạn',
      };
    }
    if (pathname?.startsWith('/main/imports')) {
      return {
        title: isOperator ? 'Kiểm tra dữ liệu nhập' : 'Import dự toán Excel',
        subtitle: isOperator ? 'Rà soát dữ liệu dự toán được nhập từ file Excel' : 'Tải lên và kiểm tra bảng tính dự toán chi phí',
      };
    }
    if (pathname?.startsWith('/main/tasks')) {
      return {
        title: isOperator ? 'Công việc điều hành' : 'Công việc của tôi',
        subtitle: isOperator ? 'Theo dõi và quản lý công việc xử lý hồ sơ' : 'Quản lý danh sách đầu việc cần thực hiện',
      };
    }
    if (pathname?.startsWith('/main/messages')) {
      return { title: 'Tin nhắn', subtitle: 'Trao đổi và phối hợp công việc' };
    }
    if (pathname?.startsWith('/main/profile')) {
      return { title: 'Hồ sơ cá nhân', subtitle: 'Quản lý thông tin tài khoản và cài đặt' };
    }
    if (pathname?.startsWith('/main/customers')) {
      return {
        title: isOperator ? 'Khách hàng' : 'Khách hàng của tôi',
        subtitle: 'Quản lý thông tin và lịch sử khách hàng',
      };
    }
    return {
      title: 'Bảng điều khiển',
      subtitle: isOperator ? 'Tổng quan hoạt động điều hành' : isSales ? 'Tổng quan hoạt động kinh doanh của bạn' : 'Tổng quan hoạt động hệ thống',
    };
  }, [pathname, isOperator, isSales]);

  const menuItems: MenuProps['items'] = [
    {
      key: '/main/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/main/dashboard">Bảng điều khiển</Link>,
    },
    {
      key: '/main/dossiers',
      icon: <FolderOpenOutlined />,
      label: <Link href="/main/dossiers">{isOperator ? 'Hồ sơ chờ xử lý' : 'Hồ sơ của tôi'}</Link>,
    },
    {
      key: '/main/imports',
      icon: <FileExcelOutlined />,
      label: <Link href="/main/imports">{isOperator ? 'Kiểm tra dữ liệu nhập' : 'Import dự toán Excel'}</Link>,
    },
    {
      key: '/main/customers',
      icon: <UsergroupAddOutlined />,
      label: <Link href="/main/customers">{isOperator ? 'Khách hàng' : 'Khách hàng của tôi'}</Link>,
    },
    {
      key: '/main/tasks',
      icon: <CheckSquareOutlined />,
      label: <Link href="/main/tasks">{isOperator ? 'Công việc điều hành' : 'Công việc của tôi'}</Link>,
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
    : pathname?.startsWith('/main/imports')
      ? '/main/imports'
      : pathname?.startsWith('/main/customers')
      ? '/main/customers'
      : pathname || '/main/dashboard';

  return (
    <Layout className="min-h-[100dvh] bg-[var(--color-bg)]">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={238}
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
          backgroundColor: '#004533',
        }}
      >
        <div className="px-4 pb-6 pt-5">
          <BrandLogo collapsed={collapsed} />
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="skylux-side-menu border-r-0 px-3 font-semibold"
          style={{ background: 'transparent' }}
        />

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <div className="skylux-sidebar-support px-4 py-4 text-[#D3A11B]">
            <div className="flex items-center gap-3">
              <CustomerServiceOutlined className="text-lg text-white" />
              {!collapsed && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Hỗ trợ & hướng dẫn</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    Gọi trợ giúp nội bộ
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
          style={{ height: 78, backgroundColor: '#FFFFFF' }}
        >
          <div className="flex flex-1 items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-600"
              aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
            />
            <div className="min-w-0">
              <h1 className="m-0 truncate text-[25px] font-bold leading-tight text-[var(--color-text)]">{routeMeta.title}</h1>
              <div className="mt-0.5 hidden truncate text-sm text-[var(--color-text-muted)] md:block">{routeMeta.subtitle}</div>
            </div>
          </div>

          <Space size={14}>
            <Button
              className="skylux-date-control hidden md:inline-flex"
              icon={<CalendarOutlined />}
              aria-label="Ngày hiện tại"
            >
              {new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
            </Button>
            <Badge
              dot
              size="small"
              offset={[-2, 5]}
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

        <Content className="skylux-content-shell overflow-y-auto bg-[var(--color-bg)]">
          <div className="mx-auto max-w-[1540px]">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
