export interface PermissionDefinition {
  code: string;
  name: string;
  module: string;
}

/** Shared by the development seed and the production bootstrap CLI. */
export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  { code: 'user.view', name: 'Xem người dùng', module: 'USER' },
  { code: 'user.create', name: 'Tạo người dùng', module: 'USER' },
  { code: 'user.update', name: 'Sửa người dùng', module: 'USER' },
  { code: 'user.delete', name: 'Xóa người dùng', module: 'USER' },
  { code: 'user.manage', name: 'Quản lý người dùng', module: 'USER' },
  { code: 'role.manage', name: 'Quản lý vai trò & quyền', module: 'USER' },
  { code: 'department.view', name: 'Xem phòng ban', module: 'USER' },
  { code: 'department.manage', name: 'Quản lý phòng ban', module: 'USER' },
  { code: 'organization.manage', name: 'Quản lý tổ chức', module: 'ORGANIZATION' },
  { code: 'dossier.view.own', name: 'Xem hồ sơ cá nhân', module: 'DOSSIER' },
  { code: 'dossier.view.team', name: 'Xem hồ sơ phòng ban', module: 'DOSSIER' },
  { code: 'dossier.view.all', name: 'Xem toàn bộ hồ sơ', module: 'DOSSIER' },
  { code: 'dossier.create', name: 'Tạo hồ sơ', module: 'DOSSIER' },
  { code: 'dossier.update', name: 'Cập nhật hồ sơ', module: 'DOSSIER' },
  { code: 'dossier.submit', name: 'Gửi duyệt hồ sơ', module: 'DOSSIER' },
  { code: 'dossier.approve', name: 'Phê duyệt hồ sơ', module: 'DOSSIER' },
  { code: 'dossier.lock', name: 'Khóa hồ sơ', module: 'DOSSIER' },
  { code: 'estimate.create', name: 'Tạo dự toán', module: 'ESTIMATE' },
  { code: 'estimate.update', name: 'Sửa dự toán', module: 'ESTIMATE' },
  { code: 'estimate.view', name: 'Xem dự toán', module: 'ESTIMATE' },
  { code: 'import.manage', name: 'Quản lý import Excel', module: 'IMPORT' },
  { code: 'document.view', name: 'Xem tài liệu hồ sơ', module: 'DOCUMENT' },
  { code: 'document.manage', name: 'Quản lý tài liệu hồ sơ', module: 'DOCUMENT' },
  { code: 'customer.manage', name: 'Quản lý khách hàng', module: 'CRM' },
  { code: 'supplier.manage', name: 'Quản lý nhà cung cấp', module: 'CRM' },
  { code: 'finance.view', name: 'Xem tài chính & công nợ', module: 'FINANCE' },
  { code: 'finance.manage', name: 'Quản lý thanh toán', module: 'FINANCE' },
  { code: 'report.view', name: 'Xem báo cáo', module: 'REPORT' },
  { code: 'report.view.team', name: 'Xem báo cáo phòng ban', module: 'REPORT' },
  { code: 'report.view.all', name: 'Xem toàn bộ báo cáo', module: 'REPORT' },
  { code: 'report.manage', name: 'Quản lý báo cáo đã lưu', module: 'REPORT' },
  { code: 'report.export', name: 'Xuất file báo cáo', module: 'REPORT' },
  { code: 'approval.view', name: 'Xem yêu cầu phê duyệt', module: 'DOSSIER' },
  { code: 'audit.view', name: 'Xem nhật ký kiểm toán', module: 'AUDIT' },
  { code: 'task.view', name: 'Xem công việc', module: 'TASK' },
  { code: 'task.manage', name: 'Quản lý công việc', module: 'TASK' },
  { code: 'chat.access', name: 'Sử dụng hệ thống chat', module: 'CHAT' },
  { code: 'kpi.view', name: 'Xem KPI cá nhân', module: 'KPI' },
  { code: 'kpi.view.team', name: 'Xem KPI phòng ban', module: 'KPI' },
  { code: 'kpi.view.all', name: 'Xem toàn bộ KPI', module: 'KPI' },
  { code: 'kpi.manage', name: 'Quản lý chỉ tiêu KPI', module: 'KPI' },
  { code: 'dashboard.sales', name: 'Xem Dashboard Sales', module: 'DASHBOARD' },
  { code: 'dashboard.operator', name: 'Xem Dashboard Operator', module: 'DASHBOARD' },
  { code: 'dashboard.ceo', name: 'Xem Dashboard CEO', module: 'DASHBOARD' },
  { code: 'master_data.view', name: 'Xem danh mục hệ thống', module: 'MASTER' },
];

const duplicateCodes = PERMISSION_CATALOG.map(({ code }) => code).filter(
  (code, index, codes) => codes.indexOf(code) !== index,
);
if (duplicateCodes.length) {
  throw new Error(`Duplicate permission codes in catalog: ${duplicateCodes.join(', ')}`);
}
