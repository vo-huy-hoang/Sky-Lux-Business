import { hasPermission } from './permission.util';

describe('permissionUtil', () => {
  describe('hasPermission', () => {
    it('should return false if user permissions is null or empty', () => {
      expect(hasPermission([], 'crm:customers:read')).toBe(false);
      expect(hasPermission(null as any, 'crm:customers:read')).toBe(false);
    });

    it('should return true if user has the specific permission', () => {
      expect(
        hasPermission(
          ['crm:customers:read', 'crm:customers:write'],
          'crm:customers:read',
        ),
      ).toBe(true);
    });

    it('should return false if user does not have the specific permission', () => {
      expect(hasPermission(['crm:customers:write'], 'crm:customers:read')).toBe(
        false,
      );
    });

    it('should return true if user has wildcard "*" permission', () => {
      expect(hasPermission(['*'], 'crm:customers:read')).toBe(true);
      expect(hasPermission(['*'], 'any:other:permission')).toBe(true);
    });

    it('should grant view access if user has corresponding manage permission (hierarchical RBAC)', () => {
      expect(hasPermission(['task.manage'], 'task.view')).toBe(true);
      expect(hasPermission(['user.manage'], 'user.view')).toBe(true);
      expect(hasPermission(['document.manage'], 'document.view')).toBe(true);
    });

    it('should not grant manage access if user only has view permission', () => {
      expect(hasPermission(['task.view'], 'task.manage')).toBe(false);
      expect(hasPermission(['user.view'], 'user.manage')).toBe(false);
    });
  });
});
