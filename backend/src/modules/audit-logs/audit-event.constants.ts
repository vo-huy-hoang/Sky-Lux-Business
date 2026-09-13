/** Stable audit event names consumed by the audit-log UI and reports. */
export const AuditAction = {
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED: 'CUSTOMER_DELETED',
  CUSTOMER_STATUS_CHANGED: 'CUSTOMER_STATUS_CHANGED',
  CUSTOMER_ASSIGNEE_CHANGED: 'CUSTOMER_ASSIGNEE_CHANGED',
  CUSTOMER_VIEWED: 'CUSTOMER_VIEWED',
  SENSITIVE_DATA_VIEWED: 'SENSITIVE_DATA_VIEWED',
  CUSTOMER_LIST_EXPORTED: 'CUSTOMER_LIST_EXPORTED',
  DOSSIER_CREATED: 'DOSSIER_CREATED',
  DOSSIER_UPDATED: 'DOSSIER_UPDATED',
  DOSSIER_DELETED: 'DOSSIER_DELETED',
  DOSSIER_STATUS_CHANGED: 'DOSSIER_STATUS_CHANGED',
  DOSSIER_ASSIGNEE_CHANGED: 'DOSSIER_ASSIGNEE_CHANGED',
  DOSSIER_VIEWED: 'DOSSIER_VIEWED',
  ESTIMATE_CREATED: 'ESTIMATE_CREATED',
  ESTIMATE_UPDATED: 'ESTIMATE_UPDATED',
  ESTIMATE_DELETED: 'ESTIMATE_DELETED',
  ESTIMATE_STATUS_CHANGED: 'ESTIMATE_STATUS_CHANGED',
  ESTIMATE_VALUE_CHANGED: 'ESTIMATE_VALUE_CHANGED',
  ESTIMATE_VIEWED: 'ESTIMATE_VIEWED',
  IMPORT_UPLOADED: 'IMPORT_UPLOADED',
  IMPORT_CONFIRMED: 'IMPORT_CONFIRMED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLES_CHANGED: 'USER_ROLES_CHANGED',
  USER_VIEWED: 'USER_VIEWED',
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  ROLE_PERMISSIONS_CHANGED: 'ROLE_PERMISSIONS_CHANGED',
} as const;

export const AuditEntityType = {
  CUSTOMER: 'customer',
  DOSSIER: 'dossier',
  ESTIMATE: 'estimate',
  IMPORT_SESSION: 'import_session',
  USER: 'user',
  ROLE: 'role',
} as const;

export const AuditActionDescription: Record<string, string> = {
  CUSTOMER_CREATED: 'Tạo khách hàng',
  CUSTOMER_UPDATED: 'Cập nhật thông tin khách hàng',
  CUSTOMER_DELETED: 'Xóa khách hàng',
  CUSTOMER_STATUS_CHANGED: 'Thay đổi trạng thái khách hàng',
  CUSTOMER_ASSIGNEE_CHANGED: 'Thay đổi nhân viên phụ trách khách hàng',
  CUSTOMER_VIEWED: 'Xem thông tin khách hàng',
  SENSITIVE_DATA_VIEWED: 'Xem thông tin được phân quyền',
  CUSTOMER_LIST_EXPORTED: 'Xuất danh sách khách hàng',
  DOSSIER_CREATED: 'Tạo hồ sơ tour',
  DOSSIER_UPDATED: 'Cập nhật hồ sơ tour',
  DOSSIER_DELETED: 'Xóa hồ sơ tour',
  DOSSIER_STATUS_CHANGED: 'Thay đổi trạng thái hồ sơ tour',
  DOSSIER_ASSIGNEE_CHANGED: 'Thay đổi nhân viên phụ trách hồ sơ tour',
  DOSSIER_VIEWED: 'Xem thông tin hồ sơ tour',
  ESTIMATE_CREATED: 'Tạo báo giá',
  ESTIMATE_UPDATED: 'Cập nhật báo giá',
  ESTIMATE_DELETED: 'Xóa báo giá',
  ESTIMATE_STATUS_CHANGED: 'Thay đổi trạng thái báo giá',
  ESTIMATE_VALUE_CHANGED: 'Thay đổi giá trị báo giá',
  ESTIMATE_VIEWED: 'Xem thông tin báo giá',
  IMPORT_UPLOADED: 'Tải tệp dữ liệu lên để nhập',
  IMPORT_CONFIRMED: 'Xác nhận nhập dữ liệu',
  USER_CREATED: 'Tạo tài khoản người dùng',
  USER_UPDATED: 'Cập nhật tài khoản người dùng',
  USER_DELETED: 'Xóa tài khoản người dùng',
  USER_ROLES_CHANGED: 'Thay đổi vai trò người dùng',
  USER_VIEWED: 'Xem thông tin tài khoản',
  ROLE_CREATED: 'Tạo vai trò',
  ROLE_UPDATED: 'Cập nhật vai trò',
  ROLE_DELETED: 'Xóa vai trò',
  ROLE_PERMISSIONS_CHANGED: 'Thay đổi quyền của vai trò',
  CREATE_DOSSIER: 'Tạo hồ sơ tour',
  UPDATE_ESTIMATE: 'Cập nhật báo giá',
  DELETE_CUSTOMER: 'Xóa khách hàng',
  UPDATE_ROLE: 'Cập nhật vai trò',
};

export function describeAuditAction(action: string): string {
  return AuditActionDescription[action] ?? 'Thao tác hệ thống';
}

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];
export type AuditEntityTypeName =
  (typeof AuditEntityType)[keyof typeof AuditEntityType];
