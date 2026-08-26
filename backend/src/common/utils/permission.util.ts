/**
 * Kiểm tra xem người dùng có quyền thực hiện hành động hay không.
 * Hỗ trợ ký tự đại diện '*' (quyền tối cao).
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return (
    userPermissions.includes('*') ||
    userPermissions.includes(requiredPermission)
  );
}
