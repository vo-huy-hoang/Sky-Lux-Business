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
  Drawer,
  List,
  Typography,
  Empty,
  Tag,
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
  AuditOutlined,
  BarChartOutlined,
  RiseOutlined,
  SettingOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';

import { useNotificationStore } from '@/lib/stores/notification-store';

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
          priority
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
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const notificationsDrawerOpen = useUIStore((state) => state.notificationsDrawerOpen);
  const setNotificationsDrawerOpen = useUIStore((state) => state.setNotificationsDrawerOpen);

  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const unreadCount = notifications.filter((n) => !n.read).length;

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
  const isCeoAdmin = user?.roles?.some((role) => ['SUPER_ADMIN', 'CEO_ADMIN'].includes(role));

  const routeMeta = useMemo(() => {
    if (isCeoAdmin) {
      if (pathname?.startsWith('/main/approvals')) {
        return { title: 'Hồ sơ chờ duyệt', subtitle: 'Danh sách hồ sơ đang chờ CEO/Admin xem xét và phê duyệt' };
      }
      if (pathname?.startsWith('/main/revenue')) {
        return { title: 'Doanh thu & thống kê', subtitle: 'Phân tích doanh thu, lợi nhuận và cơ cấu hoạt động' };
      }
      if (pathname?.startsWith('/main/kpi')) {
        return { title: 'KPI Sales', subtitle: 'Theo dõi hiệu suất đội ngũ kinh doanh toàn công ty' };
      }
      if (pathname?.startsWith('/main/users')) {
        return { title: 'Người dùng & phân quyền', subtitle: 'Quản trị tài khoản, phòng ban và vai trò truy cập' };
      }
      if (pathname?.startsWith('/main/settings')) {
        return { title: 'Cấu hình hệ thống', subtitle: 'Thiết lập danh mục và thông số vận hành dùng chung' };
      }
      if (pathname?.startsWith('/main/audit-logs')) {
        return { title: 'Nhật ký kiểm toán', subtitle: 'Theo dõi và kiểm tra toàn bộ lịch sử thao tác trong hệ thống' };
      }
      if (pathname?.startsWith('/main/reports')) {
        return { title: 'Báo cáo', subtitle: 'Tạo và xuất các báo cáo quản trị dành cho CEO/Admin' };
      }
      if (pathname?.includes('/edit-import')) {
        return {
          title: 'Chỉnh sửa dữ liệu nhập',
          subtitle: 'Rà soát và hiệu chỉnh dữ liệu chi tiết dự toán đã import',
        };
      }
      if (pathname?.startsWith('/main/dossiers/')) {
        return { title: 'Chi tiết hồ sơ', subtitle: 'Xem dự toán và quy trình phê duyệt hồ sơ' };
      }
      if (pathname?.startsWith('/main/dossiers')) {
        return { title: 'Hồ sơ toàn hệ thống', subtitle: 'Theo dõi toàn bộ hồ sơ và tiến độ xử lý trong công ty' };
      }
      if (pathname?.startsWith('/main/imports')) {
        return { title: 'Kiểm tra & chỉnh sửa dữ liệu nhập', subtitle: 'Khung dữ liệu Excel dùng chung với giao diện SALES' };
      }
      if (pathname?.startsWith('/main/customers') || pathname?.startsWith('/main/suppliers')) {
        return { title: 'Khách hàng & nhà cung cấp', subtitle: 'Quản lý dữ liệu đối tác trên toàn công ty' };
      }
      if (pathname?.startsWith('/main/messages')) {
        return { title: 'Tin nhắn', subtitle: 'Trao đổi và phối hợp công việc' };
      }
      if (pathname?.startsWith('/main/profile')) {
        return { title: 'Hồ sơ cá nhân', subtitle: 'Quản lý thông tin tài khoản và cài đặt' };
      }
      return { title: 'Bảng điều khiển CEO', subtitle: 'Tổng quan hoạt động toàn công ty' };
    }
    if (isOperator) {
      if (pathname?.startsWith('/main/sales')) {
        return { title: 'Quản lý Sales', subtitle: 'Theo dõi hồ sơ phụ trách và năng lực xử lý của đội ngũ Sales' };
      }
      if (pathname?.startsWith('/main/revenue')) {
        return { title: 'Doanh thu & thống kê', subtitle: 'Theo dõi số liệu vận hành theo hồ sơ và Sales' };
      }
      if (pathname?.includes('/edit-import')) {
        return { title: 'Chỉnh sửa dữ liệu nhập', subtitle: 'Rà soát và hiệu chỉnh dữ liệu chi tiết dự toán đã import' };
      }
      if (pathname?.startsWith('/main/dossiers/')) {
        return { title: 'Chi tiết hồ sơ', subtitle: 'Kiểm tra dự toán, lịch sử xử lý và yêu cầu bổ sung' };
      }
    }
    if (pathname?.includes('/edit-import')) {
      return { title: 'Chỉnh sửa dữ liệu nhập', subtitle: 'Rà soát và hiệu chỉnh dữ liệu chi tiết dự toán đã import' };
    }
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
    if (pathname?.startsWith('/main/customers/')) {
      return {
        title: 'Chi tiết khách hàng',
        subtitle: 'Thông tin hồ sơ, danh sách liên hệ và lịch sử giao dịch',
      };
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
  }, [pathname, isOperator, isSales, isCeoAdmin]);

  const standardMenuItems: MenuProps['items'] = [
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

  const ceoMenuItems: MenuProps['items'] = [
    { key: '/main/dashboard', icon: <DashboardOutlined />, label: <Link href="/main/dashboard">Bảng điều khiển</Link> },
    { key: '/main/dossiers', icon: <FolderOpenOutlined />, label: <Link href="/main/dossiers">Hồ sơ toàn hệ thống</Link> },
    { key: '/main/approvals', icon: <AuditOutlined />, label: <Link href="/main/approvals">Hồ sơ chờ duyệt</Link> },
    { key: '/main/revenue', icon: <BarChartOutlined />, label: <Link href="/main/revenue">Doanh thu & thống kê</Link> },
    { key: '/main/kpi', icon: <RiseOutlined />, label: <Link href="/main/kpi">KPI Sales</Link> },
    { key: '/main/customers', icon: <UsergroupAddOutlined />, label: <Link href="/main/customers">Khách hàng & nhà cung cấp</Link> },
    { key: '/main/users', icon: <TeamOutlined />, label: <Link href="/main/users">Người dùng & phân quyền</Link> },
    { key: '/main/settings', icon: <SettingOutlined />, label: <Link href="/main/settings">Cấu hình hệ thống</Link> },
    { key: '/main/audit-logs', icon: <HistoryOutlined />, label: <Link href="/main/audit-logs">Nhật ký kiểm toán</Link> },
    { key: '/main/reports', icon: <FileTextOutlined />, label: <Link href="/main/reports">Báo cáo</Link> },
    { key: '/main/messages', icon: <MessageOutlined />, label: <Link href="/main/messages">Tin nhắn</Link> },
    { key: '/main/profile', icon: <UserOutlined />, label: <Link href="/main/profile">Hồ sơ cá nhân</Link> },
  ];

  const operatorMenuItems: MenuProps['items'] = [
    { key: '/main/dashboard', icon: <DashboardOutlined />, label: <Link href="/main/dashboard">Bảng điều khiển</Link> },
    { key: '/main/dossiers', icon: <FolderOpenOutlined />, label: <Link href="/main/dossiers">Hồ sơ chờ xử lý</Link> },
    { key: '/main/imports', icon: <FileExcelOutlined />, label: <Link href="/main/imports">Kiểm tra dữ liệu nhập</Link> },
    { key: '/main/sales', icon: <TeamOutlined />, label: <Link href="/main/sales">Quản lý Sales</Link> },
    { key: '/main/revenue', icon: <BarChartOutlined />, label: <Link href="/main/revenue">Doanh thu & thống kê</Link> },
    { key: '/main/tasks', icon: <CheckSquareOutlined />, label: <Link href="/main/tasks">Công việc điều hành</Link> },
    { key: '/main/messages', icon: <MessageOutlined />, label: <Link href="/main/messages">Tin nhắn</Link> },
    { key: '/main/profile', icon: <UserOutlined />, label: <Link href="/main/profile">Hồ sơ cá nhân</Link> },
  ];

  const menuItems = isCeoAdmin ? ceoMenuItems : isOperator ? operatorMenuItems : standardMenuItems;

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
    : pathname?.startsWith('/main/sales')
    ? '/main/sales'
    : pathname?.startsWith('/main/dossiers')
    ? '/main/dossiers'
    : pathname?.startsWith('/main/imports')
      ? '/main/imports'
    : pathname?.startsWith('/main/customers')
      ? '/main/customers'
      : pathname?.startsWith('/main/suppliers')
      ? '/main/customers'
      : pathname?.startsWith('/main/approvals')
      ? '/main/approvals'
      : pathname?.startsWith('/main/revenue')
      ? '/main/revenue'
      : pathname?.startsWith('/main/kpi')
      ? '/main/kpi'
      : pathname?.startsWith('/main/users')
      ? '/main/users'
      : pathname?.startsWith('/main/settings')
      ? '/main/settings'
      : pathname?.startsWith('/main/reports')
      ? '/main/reports'
      : pathname || '/main/dashboard';

  return (
    <Layout className={`min-h-[100dvh] bg-[var(--color-bg)] ${isCeoAdmin ? 'ceo-shell' : ''} ${isOperator ? 'operator-shell' : ''}`}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={238}
        collapsedWidth={isMobile ? 0 : 72}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          setSidebarCollapsed(broken);
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
            {isCeoAdmin ? (
              !collapsed && <div>
                <div className="text-xs font-medium text-white/75">Gói hệ thống</div>
                <div className="mt-1 text-sm font-semibold text-white">Chưa có dữ liệu gói từ API</div>
                <div className="mt-3 border-t border-white/10 pt-3 text-xs font-semibold text-[#E8C85D]">Quản lý gói & thanh toán</div>
              </div>
            ) : isOperator ? (
              !collapsed && <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Lộ trình phát triển</div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/75"><span>Giai đoạn hiện tại</span><span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">Chờ API</span></div>
                <div className="mt-3 h-1 rounded-full bg-white/15"><div className="h-full w-[18%] rounded-full bg-[#E8C85D]" /></div>
                <div className="mt-2 text-xs font-medium text-[#E8C85D]">Sắp tới: Phase 3–4 <span className="float-right">›</span></div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CustomerServiceOutlined className="text-lg text-white" />
                {!collapsed && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Hỗ trợ & hướng dẫn</div>
                    <div className="mt-1 text-sm font-semibold text-white">Gọi trợ giúp nội bộ</div>
                  </div>
                )}
              </div>
            )}
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
              onClick={toggleSidebar}
              className="text-slate-600"
              aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
            />

            <div className="min-w-0">
              <h1 className="m-0 truncate text-[25px] font-bold leading-tight text-[var(--color-text)]">{routeMeta.title}</h1>
              <div className="mt-0.5 hidden truncate text-sm text-[var(--color-text-muted)] md:block">{routeMeta.subtitle}</div>
            </div>
          </div>

          <Space size={14}>
            {!isCeoAdmin && (
              <Button
                className="skylux-date-control hidden md:inline-flex"
                icon={<CalendarOutlined />}
                aria-label="Ngày hiện tại"
              >
                {new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
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

        <Content className="skylux-content-shell overflow-y-auto bg-[var(--color-bg)]">
          <div className="mx-auto max-w-[1540px]">{children}</div>
        </Content>

        {/* Notifications Drawer */}
        <Drawer
          title={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Thông báo ({unreadCount} chưa đọc)</span>
              {notifications.length > 0 && (
                <Space size={8}>
                  <Button
                    size="small"
                    type="link"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="text-xs"
                  >
                    Đọc tất cả
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={clearAll}
                    className="text-xs"
                  >
                    Xóa hết
                  </Button>
                </Space>
              )}
            </div>
          }
          placement="right"
          onClose={() => setNotificationsDrawerOpen(false)}
          open={notificationsDrawerOpen}
          size="default"
        >

          {notifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có thông báo mới"
              className="py-12"
            />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={notifications}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  onClick={() => {
                    markAsRead(item.id);
                    if (item.actionUrl) {
                      router.push(item.actionUrl);
                      setNotificationsDrawerOpen(false);
                    }
                  }}
                  className={`cursor-pointer rounded-lg p-3 transition-colors mb-2 ${
                    item.read
                      ? 'bg-slate-50 hover:bg-slate-100 opacity-75'
                      : 'bg-emerald-50/50 hover:bg-emerald-50 border-l-4 border-[#007A55]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Typography.Text strong className="text-sm text-slate-800">
                      {item.title}
                    </Typography.Text>
                    <Tag
                      color={
                        item.type === 'success'
                          ? 'success'
                          : item.type === 'warning'
                          ? 'warning'
                          : item.type === 'error'
                          ? 'error'
                          : 'processing'
                      }
                      className="m-0 text-[10px]"
                    >
                      {item.type.toUpperCase()}
                    </Tag>
                  </div>
                  <Typography.Paragraph className="text-xs text-slate-600 mb-1 mt-1">
                    {item.message}
                  </Typography.Paragraph>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </List.Item>
              )}
            />
          )}
        </Drawer>
      </Layout>
    </Layout>
  );
}

