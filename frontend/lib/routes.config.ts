import React from 'react';
import {
  DashboardOutlined,
  FolderOpenOutlined,
  UsergroupAddOutlined,
  FileExcelOutlined,
  CheckSquareOutlined,
  UserOutlined,
  MessageOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  AuditOutlined,
  BarChartOutlined,
  RiseOutlined,
  SettingOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

export interface UserContext {
  roles?: string[];
  permissions?: string[];
  isOperator?: boolean;
  isSales?: boolean;
  isCeoAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export interface AppRoute {
  key: string;
  path: string;
  icon: React.ReactNode;
  label: string | ((ctx: UserContext) => string);
  title: string | ((ctx: UserContext) => string);
  subtitle: string | ((ctx: UserContext) => string);
  requiredPermissions?: string[];
  allowedRoles?: string[];
  excludeRoles?: string[];
  hideFromNavigationRoles?: string[];
  order: number;
}

export const APP_ROUTES: AppRoute[] = [
  {
    key: '/main/dashboard',
    path: '/main/dashboard',
    icon: React.createElement(DashboardOutlined),
    label: 'Bảng điều khiển',
    title: 'Bảng điều khiển',
    subtitle: (ctx) =>
      ctx.isOperator
        ? 'Tổng quan hoạt động điều hành và hồ sơ đang xử lý'
        : ctx.isSales
        ? 'Tổng quan hiệu suất bán tour và công việc cá nhân'
        : 'Tổng quan hiệu suất toàn công ty và chỉ số vận hành',
    order: 10,
  },
  {
    key: '/main/approvals',
    path: '/main/approvals',
    icon: React.createElement(AuditOutlined),
    label: 'Hồ sơ chờ duyệt',
    title: 'Hồ sơ chờ duyệt',
    subtitle: 'Danh sách hồ sơ đang chờ CEO/Admin xem xét và phê duyệt',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 20,
  },
  {
    key: '/main/tasks',
    path: '/main/tasks',
    icon: React.createElement(CheckSquareOutlined),
    label: (ctx) =>
      ctx.isCeoAdmin
        ? 'Lịch trình điều hành'
        : ctx.isOperator
        ? 'Công việc điều hành'
        : 'Công việc của tôi',
    title: (ctx) =>
      ctx.isCeoAdmin
        ? 'Lịch trình điều hành'
        : ctx.isOperator
        ? 'Công việc điều hành'
        : 'Công việc của tôi',
    subtitle: (ctx) =>
      ctx.isCeoAdmin
        ? 'Theo dõi lịch trình các đoàn tour và dịch vụ toàn công ty'
        : ctx.isOperator
        ? 'Theo dõi và quản lý công việc xử lý hồ sơ'
        : 'Quản lý danh sách đầu việc cần thực hiện',
    requiredPermissions: ['task.manage'],
    order: 30,
  },
  {
    key: '/main/dossiers',
    path: '/main/dossiers',
    icon: React.createElement(FolderOpenOutlined),
    label: (ctx) =>
      ctx.isCeoAdmin
        ? 'Hồ sơ toàn hệ thống'
        : ctx.isOperator
        ? 'Hồ sơ chờ xử lý'
        : 'Hồ sơ của tôi',
    title: (ctx) =>
      ctx.isCeoAdmin
        ? 'Hồ sơ toàn hệ thống'
        : ctx.isOperator
        ? 'Hồ sơ chờ xử lý'
        : 'Hồ sơ của tôi',
    subtitle: (ctx) =>
      ctx.isCeoAdmin
        ? 'Theo dõi toàn bộ hồ sơ và tiến độ xử lý trong công ty'
        : ctx.isOperator
        ? 'Danh sách hồ sơ và dự toán cần kiểm tra điều hành'
        : 'Danh sách hồ sơ và dự toán của bạn',
    requiredPermissions: ['dossier.view.own', 'dossier.view.team', 'dossier.view.all'],
    order: 40,
  },
  {
    key: '/main/revenue',
    path: '/main/revenue',
    icon: React.createElement(BarChartOutlined),
    label: 'Doanh thu & thống kê',
    title: 'Doanh thu & thống kê',
    subtitle: 'Phân tích doanh thu, lợi nhuận và cơ cấu hoạt động',
    allowedRoles: ['OPERATOR', 'SUPER_ADMIN', 'CEO_ADMIN'],
    hideFromNavigationRoles: ['OPERATOR'],
    order: 50,
  },
  {
    key: '/main/reports',
    path: '/main/reports',
    icon: React.createElement(FileTextOutlined),
    label: 'Báo cáo',
    title: 'Báo cáo',
    subtitle: 'Tạo và xuất các báo cáo quản trị dành cho CEO/Admin',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 60,
  },
  {
    key: '/main/kpi',
    path: '/main/kpi',
    icon: React.createElement(RiseOutlined),
    label: 'KPI Sales',
    title: 'KPI Sales',
    subtitle: 'Theo dõi hiệu suất đội ngũ kinh doanh toàn công ty',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 70,
  },
  {
    key: '/main/customers',
    path: '/main/customers',
    icon: React.createElement(UsergroupAddOutlined),
    label: (ctx) =>
      ctx.isCeoAdmin ? 'Khách hàng & NCC' : 'Khách hàng của tôi',
    title: (ctx) =>
      ctx.isCeoAdmin ? 'Khách hàng & nhà cung cấp' : 'Khách hàng của tôi',
    subtitle: 'Quản lý thông tin và lịch sử khách hàng',
    requiredPermissions: ['customer.manage'],
    order: 80,
  },
  {
    key: '/main/suppliers',
    path: '/main/suppliers',
    icon: React.createElement(CustomerServiceOutlined),
    label: 'Nhà cung cấp',
    title: 'Nhà cung cấp',
    subtitle: 'Quản lý danh sách đối tác cung ứng dịch vụ (khách sạn, xe, vé, land tour)',
    requiredPermissions: ['supplier.manage'],
    hideFromNavigationRoles: ['CEO_ADMIN', 'SUPER_ADMIN'],
    order: 85,
  },
  {
    key: '/main/sales',
    path: '/main/sales',
    icon: React.createElement(TeamOutlined),
    label: 'Quản lý Sales',
    title: 'Quản lý Sales',
    subtitle: 'Tổng hợp hiệu suất và doanh số của đội ngũ kinh doanh',
    allowedRoles: ['OPERATOR', 'SUPER_ADMIN', 'CEO_ADMIN'],
    excludeRoles: ['CEO_ADMIN'],
    hideFromNavigationRoles: ['OPERATOR'],
    order: 88,
  },
  {
    key: '/main/imports',
    path: '/main/imports',
    icon: React.createElement(FileExcelOutlined),
    label: 'Import dự toán Excel',
    title: 'Import dự toán Excel',
    subtitle: 'Tải lên và kiểm tra bảng tính dự toán chi phí',
    requiredPermissions: ['import.manage'],
    order: 90,
  },
  {
    key: '/main/messages',
    path: '/main/messages',
    icon: React.createElement(MessageOutlined),
    label: 'Tin nhắn',
    title: 'Tin nhắn',
    subtitle: 'Trao đổi nội bộ và cập nhật tiến độ công việc',
    requiredPermissions: ['chat.access'],
    order: 100,
  },
  {
    key: '/main/users',
    path: '/main/users',
    icon: React.createElement(TeamOutlined),
    label: 'Người dùng & phân quyền',
    title: 'Người dùng & phân quyền',
    subtitle: 'Quản trị tài khoản, phòng ban và vai trò truy cập',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 110,
  },
  {
    key: '/main/settings',
    path: '/main/settings',
    icon: React.createElement(SettingOutlined),
    label: 'Cấu hình hệ thống',
    title: 'Cấu hình hệ thống',
    subtitle: 'Thiết lập danh mục và thông số vận hành dùng chung',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 120,
  },
  {
    key: '/main/audit-logs',
    path: '/main/audit-logs',
    icon: React.createElement(HistoryOutlined),
    label: 'Nhật ký hoạt động',
    title: 'Nhật ký hoạt động',
    subtitle: 'Theo dõi và kiểm tra toàn bộ lịch sử thao tác trong hệ thống',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 130,
  },
  {
    key: '/main/profile',
    path: '/main/profile',
    icon: React.createElement(UserOutlined),
    label: 'Hồ sơ cá nhân',
    title: 'Hồ sơ cá nhân',
    subtitle: 'Xem và cập nhật thông tin tài khoản, đổi mật khẩu',
    order: 140,
  },
];

/**
 * Kiểm tra xem một người dùng có quyền truy cập vào route hay không
 */
export function canAccessRoute(route: AppRoute, ctx: UserContext): boolean {
  // Nếu route có loại trừ vai trò cụ thể
  if (route.excludeRoles && route.excludeRoles.length > 0) {
    const isExcluded = ctx.roles?.some((r) => route.excludeRoles!.includes(r));
    if (isExcluded) return false;
  }

  // Super Admin và CEO_ADMIN có quyền truy cập mặc định trừ khi bị exclude
  if (ctx.isSuperAdmin || ctx.isCeoAdmin || ctx.permissions?.includes('*')) {
    return true;
  }

  // Kiểm tra vai trò được cho phép (allowedRoles)
  if (route.allowedRoles && route.allowedRoles.length > 0) {
    const hasRole = ctx.roles?.some((r) => route.allowedRoles!.includes(r));
    if (hasRole) return true;
  }

  // Kiểm tra danh mục quyền bắt buộc (requiredPermissions)
  if (route.requiredPermissions && route.requiredPermissions.length > 0) {
    const hasPermission = ctx.permissions?.some((p) =>
      route.requiredPermissions!.includes(p),
    );
    if (hasPermission) return true;
  }

  // Nếu không có bất kỳ ràng buộc nào, route mở cho mọi người dùng đã đăng nhập
  return !route.allowedRoles && !route.requiredPermissions;
}

/**
 * Lọc danh sách menu phù hợp nhất cho người dùng đang đăng nhập
 */
export function getAccessibleRoutes(ctx: UserContext): AppRoute[] {
  return APP_ROUTES.filter((route) => canAccessRoute(route, ctx)).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * Kiểm tra xem một đường dẫn cụ thể có được phép truy cập bởi người dùng hay không
 */
export function isPathAccessible(
  pathname: string | null,
  ctx: UserContext,
): boolean {
  if (!pathname || pathname === '/main') return true;

  // Cho phép Operator, Sales, CEO/Admin và Super Admin truy cập trang chi tiết hồ sơ tour
  if (pathname.startsWith('/main/dossiers/')) {
    return !!(ctx.isOperator || ctx.isSales || ctx.isCeoAdmin || ctx.isSuperAdmin);
  }

  // Khớp chính xác route dài nhất
  const matched = APP_ROUTES.filter((r) => pathname.startsWith(r.path)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];

  if (!matched) return true;
  return canAccessRoute(matched, ctx);
}

/**
 * Lấy tiêu đề và phụ đề Header tương ứng với đường dẫn hiện tại
 */
export function getRouteMeta(
  pathname: string | null,
  ctx: UserContext,
): { title: string; subtitle: string; icon?: React.ReactNode } {
  if (!pathname) {
    return {
      title: 'Bảng điều khiển',
      subtitle: 'Tổng quan hoạt động hệ thống',
    };
  }

  // Trường hợp đặc biệt: Chi tiết hồ sơ
  if (pathname.startsWith('/main/dossiers/')) {
    return {
      title: 'Chi tiết hồ sơ',
      subtitle: 'Xem dự toán, tài liệu và quy trình phê duyệt hồ sơ tour',
    };
  }

  // Tìm route khớp với tiền tố dài nhất
  const matched = APP_ROUTES.filter((r) => pathname.startsWith(r.path)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];

  if (matched) {
    const title =
      typeof matched.title === 'function' ? matched.title(ctx) : matched.title;
    const subtitle =
      typeof matched.subtitle === 'function'
        ? matched.subtitle(ctx)
        : matched.subtitle;
    return { title, subtitle, icon: matched.icon };
  }

  return {
    title: 'Hệ thống Quản trị SkyLux',
    subtitle: 'Nền tảng Quản lý và Vận hành Tour Du lịch Cao cấp',
  };
}

/**
 * Xác định chính xác key của menu đang được chọn (highlight)
 */
export function getActiveMenuKey(pathname: string | null): string {
  if (!pathname || pathname === '/main') return '/main/dashboard';

  // Khớp chính xác route dài nhất
  const matched = APP_ROUTES.filter((r) => pathname.startsWith(r.path)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];

  return matched ? matched.key : pathname;
}
