/**
 * Kiểm tra xem người dùng có quyền thực hiện hành động hay không.
 * Hỗ trợ ký tự đại diện '*' (quyền tối cao).
 */
export function hasPermission(
  userPermissions: string[],
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
