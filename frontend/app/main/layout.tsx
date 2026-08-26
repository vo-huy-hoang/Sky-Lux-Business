'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  Button,
  theme as antTheme,
} from 'antd';
import {
  DashboardOutlined,
  FolderOpenOutlined,
  CalculatorOutlined,
  UsergroupAddOutlined,
  ShopOutlined,
  FileExcelOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  TrophyOutlined,
  SettingOutlined,
  TeamOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  CompassOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { token } = antTheme.useToken();

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
      label: <Link href="/main/dossiers">Hồ sơ tour (Dossiers)</Link>,
    },
    {
      key: '/main/customers',
      icon: <UsergroupAddOutlined />,
      label: <Link href="/main/customers">Khách hàng (CRM)</Link>,
    },
    {
      key: '/main/suppliers',
      icon: <ShopOutlined />,
      label: <Link href="/main/suppliers">Nhà cung cấp (NCC)</Link>,
    },
    {
      key: '/main/imports',
      icon: <FileExcelOutlined />,
      label: <Link href="/main/imports">Import Excel dự toán</Link>,
    },
    {
      key: '/main/tasks',
      icon: <CheckSquareOutlined />,
      label: <Link href="/main/tasks">Quản lý công việc</Link>,
    },
    {
      key: '/main/reports',
      icon: <BarChartOutlined />,
      label: <Link href="/main/reports">Báo cáo & Doanh thu</Link>,
    },
    {
      key: '/main/kpi',
      icon: <TrophyOutlined />,
      label: <Link href="/main/kpi">Chỉ tiêu KPI</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'admin-group',
      icon: <SettingOutlined />,
      label: 'Quản trị hệ thống',
      children: [
        {
          key: '/main/users',
          icon: <TeamOutlined />,
          label: <Link href="/main/users">Người dùng & Phân quyền</Link>,
        },
        {
          key: '/main/settings',
          icon: <SettingOutlined />,
          label: <Link href="/main/settings">Cài đặt tổ chức</Link>,
        },
      ],
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
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  // Determine active menu key
  const selectedKey = pathname || '/main/dashboard';

  return (
    <Layout className="min-h-screen">
      {/* Sidebar Navigation */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        theme="light"
        className="border-r border-slate-200 shadow-sm"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#0A2540] flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            <CompassOutlined />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-base text-[#0A2540] tracking-tight truncate">
                SKY-LUX CRM
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest truncate font-medium">
                Travel Operations
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['admin-group']}
          items={menuItems}
          className="border-r-0 py-2 font-medium"
        />
      </Sider>

      <Layout>
        {/* Top Header */}
        <Header
          className="bg-white px-6 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shadow-xs"
          style={{ height: 64 }}
        >
          {/* Left Collapse Button & Title */}
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-600"
            />
            <Text className="text-slate-700 font-semibold text-base hidden sm:inline-block">
              Sky-Lux Travel Corporation
            </Text>
          </div>

          {/* Right Notifications & Profile */}
          <Space size={16}>
            {/* Notification Bell */}
            <Badge count={3} size="small" offset={[-2, 4]}>
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined className="text-lg text-slate-600" />}
              />
            </Badge>

            {/* User Dropdown */}
            <Dropdown
              menu={{ items: userDropdownItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Avatar
                  style={{ backgroundColor: '#0A2540' }}
                  icon={<UserOutlined />}
                >
                  {user?.fullName?.charAt(0)}
                </Avatar>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.fullName || 'Quản trị viên'}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    {user?.roles?.[0] || 'SuperAdmin'}
                  </span>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* Main Content Area */}
        <Content className="p-6 bg-slate-50 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
