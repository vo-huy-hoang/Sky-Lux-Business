/**
 * Pure authorization policy & capability module for Sky-Lux frontend.
 * Decoupled from React and UI icon libraries for deterministic in-process testing.
 */

export interface AuthorizationSubject {
  roles?: string[];
  permissions?: string[];
  isOperator?: boolean;
  isSales?: boolean;
  isCeoAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export type UserContext = AuthorizationSubject;

/**
 * Pure route policy definition without React or Ant Design icon dependencies.
 */
export interface RoutePolicyDefinition {
  key: string;
  path: string;
  label: string | ((ctx: UserContext) => string);
  title: string | ((ctx: UserContext) => string);
  subtitle: string | ((ctx: UserContext) => string);
  requiredPermissions?: string[];
  allowedRoles?: string[];
  excludeRoles?: string[];
  superAdminOnly?: boolean;
  hideFromNavigationRoles?: string[];
  hubKey?: string;
  order: number;
}

/**
 * Kiểm tra xem người dùng có quyền thực hiện hành động hay không.
 * Hỗ trợ ký tự đại diện '*' (quyền tối cao).
 * Phân cấp quyền tự nhiên: Sở hữu quyền '.manage' thì tự động có quyền '.view' tương ứng.
 * Đảm bảo tính nhất quán 1:1 với backend permission.util.
 */
export function hasPermission(
  userPermissions: string[] | null | undefined,
  requiredPermission: string,
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (
    userPermissions.includes('*') ||
    userPermissions.includes(requiredPermission)
  ) {
    return true;
  }

  // Phân cấp quyền tự nhiên: Sở hữu quyền '.manage' thì tự động có quyền '.view' tương ứng
  if (requiredPermission.endsWith('.view')) {
    const modulePrefix = requiredPermission.slice(0, -5);
    if (userPermissions.includes(`${modulePrefix}.manage`)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Semantic Capability Helpers (Expand Phase)
// ============================================================================

/**
 * Platform Super Admin: Chỉ tài khoản có vai trò 'SUPER_ADMIN' thực sự trên nền tảng.
 */
export function isPlatformSuperAdmin(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (subject.roles) {
    return subject.roles.includes('SUPER_ADMIN');
  }
  return Boolean(subject.isSuperAdmin && !subject.isCeoAdmin);
}

/**
 * Executive Admin: Tài khoản cấp lãnh đạo công ty hoặc nền tảng (SUPER_ADMIN hoặc CEO_ADMIN).
 */
export function isExecutiveAdmin(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (subject.isSuperAdmin || subject.isCeoAdmin) return true;
  if (!subject.roles) return false;
  return (
    subject.roles.includes('SUPER_ADMIN') || subject.roles.includes('CEO_ADMIN')
  );
}

/**
 * Kiểm tra người dùng có vai trò Điều hành (OPERATOR).
 */
export function isOperator(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (subject.roles) return hasExactRole(subject, 'OPERATOR');
  return Boolean(subject.isOperator);
}

/**
 * Kiểm tra người dùng có vai trò Bán hàng (SALES).
 */
export function isSales(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (subject.roles) return hasExactRole(subject, 'SALES');
  return Boolean(subject.isSales);
}

/**
 * Kiểm tra người dùng có vai trò Kế toán (ACCOUNTANT).
 */
export function isAccountant(subject?: AuthorizationSubject | null): boolean {
  return hasExactRole(subject, 'ACCOUNTANT');
}

/**
 * Kiểm tra người dùng có vai trò Giám đốc điều hành doanh nghiệp (CEO_ADMIN).
 */
export function isCeoAdmin(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (subject.roles) return hasExactRole(subject, 'CEO_ADMIN');
  return Boolean(subject.isCeoAdmin);
}

/**
 * Kiểm tra chính xác vai trò người dùng mà KHÔNG tự động leo quyền SUPER_ADMIN.
 */
export function hasExactRole(
  subject: AuthorizationSubject | null | undefined,
  role: string | string[],
): boolean {
  if (!subject || !subject.roles) return false;
  if (Array.isArray(role)) {
    return role.some((r) => subject.roles!.includes(r));
  }
  return subject.roles.includes(role);
}

/**
 * Khả năng phê duyệt hồ sơ tour và hợp đồng.
 */
export function canApproveDossier(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return (
    hasPermission(subject.permissions, 'dossier.approve') ||
    hasPermission(subject.permissions, 'contract.approve')
  );
}

/**
 * Khả năng quản trị người dùng và nhân sự.
 */
export function canManageUsers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return hasPermission(subject.permissions, 'user.manage');
}

/**
 * Khả năng truy cập Hub Tài chính & Báo cáo quản trị.
 */
export function canAccessFinancialHub(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  if (hasExactRole(subject, 'ACCOUNTANT')) return true;
  return (
    hasPermission(subject.permissions, 'finance.manage') ||
    hasPermission(subject.permissions, 'finance.view') ||
    hasPermission(subject.permissions, 'report.view') ||
    hasPermission(subject.permissions, 'dossier.cost.view')
  );
}

/**
 * Khả năng quản trị tenant và doanh nghiệp (Chỉ Platform Super Admin).
 */
export function canManageOrganizations(subject?: AuthorizationSubject | null): boolean {
  return isPlatformSuperAdmin(subject);
}

/**
 * Khả năng quản lý vai trò và phân quyền.
 */
export function canManageRoles(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return hasPermission(subject.permissions, 'role.manage');
}

/**
 * Khả năng xuất và tải các báo cáo tài chính/quản trị.
 */
export function canExportReports(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return (
    hasPermission(subject.permissions, 'report.export') ||
    hasPermission(subject.permissions, 'report.view')
  );
}

/**
 * Khả năng quản lý dữ liệu khách hàng.
 */
export function canManageCustomers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return hasPermission(subject.permissions, 'customer.manage');
}

/**
 * Khả năng xem thông tin khách hàng.
 */
export function canViewCustomers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return (
    hasPermission(subject.permissions, 'customer.view') ||
    hasPermission(subject.permissions, 'customer.manage')
  );
}

/**
 * Khả năng quản lý nhà cung cấp.
 */
export function canManageSuppliers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return hasPermission(subject.permissions, 'supplier.manage');
}

/**
 * Khả năng xem nhà cung cấp.
 */
export function canViewSuppliers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return (
    hasPermission(subject.permissions, 'supplier.view') ||
    hasPermission(subject.permissions, 'supplier.manage')
  );
}

/**
 * Khả năng quản lý công việc và lịch trình điều hành.
 */
export function canManageTasks(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return hasPermission(subject.permissions, 'task.manage');
}

/**
 * Khả năng xem công việc và lịch trình.
 */
export function canViewTasks(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return (
    hasPermission(subject.permissions, 'task.view') ||
    hasPermission(subject.permissions, 'task.manage')
  );
}

/**
 * Khả năng quản lý hồ sơ tour.
 */
export function canManageDossiers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  return hasPermission(subject.permissions, 'dossier.manage');
}

/**
 * Khả năng xem hồ sơ tour.
 */
export function canViewDossiers(subject?: AuthorizationSubject | null): boolean {
  if (!subject) return false;
  if (isExecutiveAdmin(subject)) return true;
  if (
    hasPermission(subject.permissions, 'dossier.view') ||
    hasPermission(subject.permissions, 'dossier.manage')
  ) {
    return true;
  }
  const viewPerms = ['dossier.view.own', 'dossier.view.team', 'dossier.view.all'];
  return viewPerms.some((p) => hasPermission(subject.permissions, p));
}

// ============================================================================
// Pure Route Definitions (Icon-free)
// ============================================================================

export const ROUTE_POLICY_DEFINITIONS: RoutePolicyDefinition[] = [
  {
    key: '/dashboard',
    path: '/dashboard',
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
    key: '/organizations',
    path: '/organizations',
    label: 'Doanh nghiệp',
    title: 'Doanh nghiệp',
    subtitle: 'Quản lý các doanh nghiệp và tenant trên nền tảng Sky-Lux CRM',
    superAdminOnly: true,
    order: 15,
  },
  {
    key: '/approvals',
    path: '/approvals',
    label: 'Hồ sơ chờ duyệt',
    title: 'Hồ sơ chờ duyệt',
    subtitle: 'Danh sách hồ sơ đang chờ CEO/Admin xem xét và phê duyệt',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 20,
  },
  {
    key: '/tasks',
    path: '/tasks',
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
    key: '/dossiers',
    path: '/dossiers',
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
    key: '/reports',
    path: '/reports',
    label: (ctx) => (ctx.isSuperAdmin ? 'Báo cáo' : 'Báo cáo & Tài chính'),
    title: (ctx) => (ctx.isSuperAdmin ? 'Báo cáo' : 'Báo cáo & Tài chính'),
    subtitle: (ctx) =>
      ctx.isSuperAdmin
        ? 'Tạo và xuất các báo cáo quản trị dành cho CEO/Admin'
        : 'Phân tích doanh thu, báo cáo quản trị và chỉ số hiệu suất kinh doanh',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN', 'OPERATOR'],
    hideFromNavigationRoles: ['OPERATOR'],
    order: 50,
  },
  {
    key: '/revenue',
    path: '/revenue',
    label: (ctx) => (ctx.isSuperAdmin ? 'Thanh toán' : 'Doanh thu & thống kê'),
    title: (ctx) => (ctx.isSuperAdmin ? 'Thanh toán dịch vụ' : 'Doanh thu & thống kê'),
    subtitle: (ctx) =>
      ctx.isSuperAdmin
        ? 'Theo dõi phí thuê bao phần mềm và khoản thanh toán của từng doanh nghiệp'
        : 'Phân tích doanh thu, lợi nhuận và cơ cấu hoạt động',
    allowedRoles: ['OPERATOR', 'SUPER_ADMIN', 'CEO_ADMIN'],
    hideFromNavigationRoles: ['OPERATOR', 'CEO_ADMIN'],
    hubKey: '/reports',
    order: 55,
  },
  {
    key: '/kpi',
    path: '/kpi',
    label: 'KPI Sales',
    title: 'KPI Sales',
    subtitle: 'Theo dõi hiệu suất đội ngũ kinh doanh toàn công ty',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    hideFromNavigationRoles: ['CEO_ADMIN'],
    hubKey: '/reports',
    order: 60,
  },
  {
    key: '/customers',
    path: '/customers',
    label: (ctx) =>
      ctx.isCeoAdmin ? 'Khách hàng & NCC' : 'Khách hàng của tôi',
    title: (ctx) =>
      ctx.isCeoAdmin ? 'Khách hàng & nhà cung cấp' : 'Khách hàng của tôi',
    subtitle: 'Quản lý thông tin và lịch sử khách hàng',
    requiredPermissions: ['customer.manage'],
    order: 80,
  },
  {
    key: '/suppliers',
    path: '/suppliers',
    label: 'Nhà cung cấp',
    title: 'Nhà cung cấp',
    subtitle: 'Quản lý danh sách đối tác cung ứng dịch vụ (khách sạn, xe, vé, land tour)',
    requiredPermissions: ['supplier.manage'],
    hideFromNavigationRoles: ['CEO_ADMIN', 'SUPER_ADMIN'],
    order: 85,
  },
  {
    key: '/sales',
    path: '/sales',
    label: 'Quản lý Sales',
    title: 'Quản lý Sales',
    subtitle: 'Tổng hợp hiệu suất và doanh số của đội ngũ kinh doanh',
    allowedRoles: ['OPERATOR', 'SUPER_ADMIN', 'CEO_ADMIN'],
    excludeRoles: ['CEO_ADMIN'],
    hideFromNavigationRoles: ['OPERATOR'],
    order: 88,
  },
  {
    key: '/imports',
    path: '/imports',
    label: 'Import dự toán Excel',
    title: 'Import dự toán Excel',
    subtitle: 'Tải lên và kiểm tra bảng tính dự toán chi phí',
    requiredPermissions: ['import.manage'],
    order: 90,
  },
  {
    key: '/messages',
    path: '/messages',
    label: 'Tin nhắn',
    title: 'Tin nhắn',
    subtitle: 'Trao đổi nội bộ và cập nhật tiến độ công việc',
    requiredPermissions: ['chat.access'],
    order: 100,
  },
  {
    key: '/users',
    path: '/users',
    label: 'Người dùng & phân quyền',
    title: 'Người dùng & phân quyền',
    subtitle: 'Quản trị tài khoản, phòng ban và vai trò truy cập',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 110,
  },
  {
    key: '/settings',
    path: '/settings',
    label: 'Cấu hình hệ thống',
    title: 'Cấu hình hệ thống',
    subtitle: 'Thiết lập danh mục và thông số vận hành dùng chung',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 120,
  },
  {
    key: '/audit-logs',
    path: '/audit-logs',
    label: 'Nhật ký hoạt động',
    title: 'Nhật ký hoạt động',
    subtitle: 'Theo dõi và kiểm tra toàn bộ lịch sử thao tác trong hệ thống',
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
    order: 130,
  },
  {
    key: '/profile',
    path: '/profile',
    label: 'Hồ sơ cá nhân',
    title: 'Hồ sơ cá nhân',
    subtitle: 'Xem và cập nhật thông tin tài khoản, đổi mật khẩu',
    order: 140,
  },
];

// ============================================================================
// Pure Route Policy Evaluation Functions (In-Process)
// ============================================================================

/**
 * Kiểm tra xem người dùng có quyền truy cập vào một route hay không.
 */
export function canAccessRoutePolicy(
  route: RoutePolicyDefinition,
  ctx: UserContext,
): boolean {
  if (route.superAdminOnly) {
    return isPlatformSuperAdmin(ctx);
  }

  // Nếu route có loại trừ vai trò cụ thể
  if (route.excludeRoles && route.excludeRoles.length > 0) {
    const isExcluded = ctx.roles?.some((r) => route.excludeRoles!.includes(r));
    if (isExcluded) return false;
  }

  // Cấp lãnh đạo (Super Admin và CEO_ADMIN) hoặc wildcard có quyền truy cập mặc định trừ khi bị exclude
  if (isExecutiveAdmin(ctx) || ctx.permissions?.includes('*')) {
    return true;
  }

  // Kiểm tra vai trò được cho phép (allowedRoles)
  if (route.allowedRoles && route.allowedRoles.length > 0) {
    const hasRole = ctx.roles?.some((r) => route.allowedRoles!.includes(r));
    if (hasRole) return true;
  }

  // Kiểm tra danh mục quyền bắt buộc (requiredPermissions) với .manage -> .view parity
  if (route.requiredPermissions && route.requiredPermissions.length > 0) {
    const hasAnyPermission = route.requiredPermissions.some((req) =>
      hasPermission(ctx.permissions, req),
    );
    if (hasAnyPermission) return true;
  }

  // Nếu không có bất kỳ ràng buộc nào, route mở cho mọi người dùng đã đăng nhập
  return !route.allowedRoles && !route.requiredPermissions;
}

/**
 * Lọc danh sách route phù hợp nhất cho người dùng đang đăng nhập (Pure).
 */
export function getAccessibleRoutesPolicy(
  ctx: UserContext,
  routes: RoutePolicyDefinition[] = ROUTE_POLICY_DEFINITIONS,
): RoutePolicyDefinition[] {
  return routes
    .filter((route) => canAccessRoutePolicy(route, ctx))
    .sort((a, b) => a.order - b.order);
}

/**
 * Kiểm tra xem một đường dẫn cụ thể có được phép truy cập bởi người dùng hay không (Pure).
 */
export function isPathAccessiblePolicy(
  pathname: string | null,
  ctx: UserContext,
  routes: RoutePolicyDefinition[] = ROUTE_POLICY_DEFINITIONS,
): boolean {
  if (!pathname || pathname === '/' || pathname === '/main') return true;

  // Chuẩn hóa đường dẫn legacy nếu bắt đầu bằng /main
  const normalized = pathname.startsWith('/main/')
    ? pathname.replace(/^\/main/, '')
    : pathname;

  // Chỉ SUPER_ADMIN mới có quyền tạo doanh nghiệp / tenant mới
  if (normalized === '/organizations/new') {
    return isPlatformSuperAdmin(ctx);
  }

  // Cho phép Operator, Sales, CEO/Admin và Super Admin truy cập trang chi tiết hồ sơ tour
  if (normalized.startsWith('/dossiers/')) {
    return Boolean(
      isOperator(ctx) ||
        isSales(ctx) ||
        isExecutiveAdmin(ctx) ||
        ctx.isOperator ||
        ctx.isSales ||
        ctx.isCeoAdmin ||
        ctx.isSuperAdmin,
    );
  }

  // Khớp chính xác route dài nhất
  const matched = routes
    .filter((r) => normalized.startsWith(r.path) || pathname.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length)[0];

  if (!matched) return true;
  return canAccessRoutePolicy(matched, ctx);
}

/**
 * Lấy tiêu đề và phụ đề Header tương ứng với đường dẫn (Pure, không React icon).
 */
export function getRouteMetaPolicy(
  pathname: string | null,
  ctx: UserContext,
  routes: RoutePolicyDefinition[] = ROUTE_POLICY_DEFINITIONS,
): { title: string; subtitle: string; key?: string } {
  if (!pathname) {
    return {
      title: 'Bảng điều khiển',
      subtitle: 'Tổng quan hoạt động hệ thống',
    };
  }

  const normalized = pathname.startsWith('/main/')
    ? pathname.replace(/^\/main/, '')
    : pathname;

  if (normalized === '/organizations/new') {
    return {
      title: 'Tạo doanh nghiệp mới',
      subtitle: 'Đăng ký doanh nghiệp mới sử dụng Sky-Lux CRM',
      key: '/organizations',
    };
  }

  if (normalized.startsWith('/dossiers/')) {
    return {
      title: 'Chi tiết hồ sơ',
      subtitle: 'Xem dự toán, tài liệu và quy trình phê duyệt hồ sơ tour',
      key: '/dossiers',
    };
  }

  const matched = routes
    .filter((r) => normalized.startsWith(r.path) || pathname.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length)[0];

  if (matched) {
    const title =
      typeof matched.title === 'function' ? matched.title(ctx) : matched.title;
    const subtitle =
      typeof matched.subtitle === 'function'
        ? matched.subtitle(ctx)
        : matched.subtitle;
    return { title, subtitle, key: matched.key };
  }

  return {
    title: 'Hệ thống Quản trị SkyLux',
    subtitle: 'Nền tảng Quản lý và Vận hành Tour Du lịch Cao cấp',
  };
}

/**
 * Xác định chính xác key của menu đang được chọn (highlight) (Pure).
 */
export function getActiveMenuKeyPolicy(
  pathname: string | null,
  routes: RoutePolicyDefinition[] = ROUTE_POLICY_DEFINITIONS,
): string {
  if (
    !pathname ||
    pathname === '/' ||
    pathname === '/main' ||
    pathname === '/dashboard'
  ) {
    return '/dashboard';
  }

  const normalized = pathname.startsWith('/main/')
    ? pathname.replace(/^\/main/, '')
    : pathname;

  const matched = routes
    .filter((r) => normalized.startsWith(r.path) || pathname.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length)[0];

  if (!matched) return normalized;
  return matched.hubKey || matched.key;
}
