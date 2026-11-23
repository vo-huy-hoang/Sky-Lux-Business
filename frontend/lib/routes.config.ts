import React from 'react';
import {
  DashboardOutlined,
  FolderOpenOutlined,
  UsergroupAddOutlined,
  FileExcelOutlined,
  CheckSquareOutlined,
  UserOutlined,
  MessageOutlined,
  ShopOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  AuditOutlined,
  BarChartOutlined,
  RiseOutlined,
  SettingOutlined,
  HistoryOutlined,
  BankOutlined,
} from '@ant-design/icons';
import {
  UserContext,
  RoutePolicyDefinition,
  ROUTE_POLICY_DEFINITIONS,
  canAccessRoutePolicy,
  isPathAccessiblePolicy,
  getActiveMenuKeyPolicy,
} from './authorization-policy';

export type { UserContext };

export interface AppRoute extends RoutePolicyDefinition {
  icon: React.ReactNode;
}

export const ROUTE_ICON_MAP: Record<string, React.ReactNode> = {
  '/dashboard': React.createElement(DashboardOutlined),
  '/organizations': React.createElement(BankOutlined),
  '/approvals': React.createElement(AuditOutlined),
  '/tasks': React.createElement(CheckSquareOutlined),
  '/dossiers': React.createElement(FolderOpenOutlined),
  '/reports': React.createElement(BarChartOutlined),
  '/revenue': React.createElement(BarChartOutlined),
  '/kpi': React.createElement(RiseOutlined),
  '/customers': React.createElement(UsergroupAddOutlined),
  '/suppliers': React.createElement(ShopOutlined),
  '/sales': React.createElement(TeamOutlined),
  '/imports': React.createElement(FileExcelOutlined),
  '/messages': React.createElement(MessageOutlined),
  '/users': React.createElement(UserSwitchOutlined),
  '/settings': React.createElement(SettingOutlined),
  '/audit-logs': React.createElement(HistoryOutlined),
  '/profile': React.createElement(UserOutlined),
};

export const APP_ROUTES: AppRoute[] = ROUTE_POLICY_DEFINITIONS.map((def) => ({
  ...def,
  icon: ROUTE_ICON_MAP[def.key] ?? null,
}));

/**
 * Kiểm tra xem một người dùng có quyền truy cập vào route hay không.
 * Ủy quyền cho pure authorization policy.
 */
export function canAccessRoute(
  route: AppRoute | RoutePolicyDefinition,
  ctx: UserContext,
): boolean {
  return canAccessRoutePolicy(route, ctx);
}

/**
 * Lọc danh sách menu phù hợp nhất cho người dùng đang đăng nhập.
 */
export function getAccessibleRoutes(ctx: UserContext): AppRoute[] {
  return APP_ROUTES.filter((route) => canAccessRoute(route, ctx)).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * Kiểm tra xem một đường dẫn cụ thể có được phép truy cập bởi người dùng hay không.
 */
export function isPathAccessible(
  pathname: string | null,
  ctx: UserContext,
): boolean {
  return isPathAccessiblePolicy(pathname, ctx, ROUTE_POLICY_DEFINITIONS);
}

/**
 * Lấy tiêu đề và phụ đề Header tương ứng với đường dẫn hiện tại.
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

  // Chuẩn hóa đường dẫn legacy nếu bắt đầu bằng /main
  const normalized = pathname.startsWith('/main/') ? pathname.replace(/^\/main/, '') : pathname;

  if (normalized === '/organizations/new') {
    return {
      title: 'Tạo doanh nghiệp mới',
      subtitle: 'Đăng ký doanh nghiệp mới sử dụng Sky-Lux CRM',
      icon: React.createElement(BankOutlined),
    };
  }

  // Trường hợp đặc biệt: Chi tiết hồ sơ
  if (normalized.startsWith('/dossiers/')) {
    return {
      title: 'Chi tiết hồ sơ',
      subtitle: 'Xem dự toán, tài liệu và quy trình phê duyệt hồ sơ tour',
    };
  }

  // Tìm route khớp với tiền tố dài nhất
  const matched = APP_ROUTES.filter((r) => normalized.startsWith(r.path) || pathname.startsWith(r.path)).sort(
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
 * Xác định chính xác key của menu đang được chọn (highlight).
 */
export function getActiveMenuKey(pathname: string | null): string {
  return getActiveMenuKeyPolicy(pathname, ROUTE_POLICY_DEFINITIONS);
}
