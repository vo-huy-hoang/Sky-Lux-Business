import {
  BASELINE_ROLE_PERMISSIONS,
  syncBaselinePermissionsForRole,
} from './baseline-role-permissions';
import { PERMISSION_CATALOG } from './permissions.catalog';

describe('Baseline Role Permissions Catalog Integrity', () => {
  const catalogCodes = new Set(PERMISSION_CATALOG.map((p) => p.code));

  it('should define baseline permissions for SALES, OPERATOR, and CEO_ADMIN', () => {
    expect(BASELINE_ROLE_PERMISSIONS.SALES).toBeDefined();
    expect(BASELINE_ROLE_PERMISSIONS.OPERATOR).toBeDefined();
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN).toBeDefined();
    expect(BASELINE_ROLE_PERMISSIONS.SALES.length).toBeGreaterThan(15);
    expect(BASELINE_ROLE_PERMISSIONS.OPERATOR.length).toBeGreaterThan(15);
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN.length).toBeGreaterThan(25);
  });

  it('should guarantee dashboard.ceo is in CEO_ADMIN baseline', () => {
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN).toContain('dashboard.ceo');
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN).toContain('dossier.view.all');
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN).toContain('dossier.approve');
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN).toContain('report.view.all');
    expect(BASELINE_ROLE_PERMISSIONS.CEO_ADMIN).toContain('user.manage');
  });

  it('should guarantee dashboard.sales is in SALES baseline', () => {
    expect(BASELINE_ROLE_PERMISSIONS.SALES).toContain('dashboard.sales');
    expect(BASELINE_ROLE_PERMISSIONS.SALES).toContain('dossier.view.own');
    expect(BASELINE_ROLE_PERMISSIONS.SALES).toContain('customer.manage');
    expect(BASELINE_ROLE_PERMISSIONS.SALES).toContain('import.manage');
  });

  it('should guarantee dashboard.operator is in OPERATOR baseline', () => {
    expect(BASELINE_ROLE_PERMISSIONS.OPERATOR).toContain('dashboard.operator');
    expect(BASELINE_ROLE_PERMISSIONS.OPERATOR).toContain('dossier.view.all');
    expect(BASELINE_ROLE_PERMISSIONS.OPERATOR).toContain('supplier.manage');
  });

  it('all baseline codes must exist in the canonical PERMISSION_CATALOG', () => {
    for (const [role, codes] of Object.entries(BASELINE_ROLE_PERMISSIONS)) {
      for (const code of codes) {
        expect(catalogCodes.has(code)).toBe(true);
      }
    }
  });

  it('should gracefully handle incomplete manager/repos without throwing', async () => {
    const incompleteManager = {
      getRepository: jest.fn().mockReturnValue({}),
    } as any;

    await expect(
      syncBaselinePermissionsForRole(incompleteManager, {
        id: 'r-1',
        code: 'SALES',
      }),
    ).resolves.not.toThrow();
  });

  it('should sync missing baseline permissions when repos are fully mocked', async () => {
    const mockPermissions = [
      { id: 'p-1', code: 'dashboard.sales' },
      { id: 'p-2', code: 'dossier.view.own' },
    ];
    const permRepo = {
      find: jest.fn().mockResolvedValue(mockPermissions),
    };
    const rolePermRepo = {
      find: jest.fn().mockResolvedValue([{ permissionId: 'p-1' }]),
      create: jest.fn((val) => val),
      save: jest.fn().mockResolvedValue([]),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'Permission') return permRepo;
        if (entity.name === 'RolePermission') return rolePermRepo;
        return {};
      }),
    } as any;

    await syncBaselinePermissionsForRole(manager, {
      id: 'r-1',
      code: 'SALES',
    });

    expect(permRepo.find).toHaveBeenCalled();
    expect(rolePermRepo.find).toHaveBeenCalled();
    expect(rolePermRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        roleId: 'r-1',
        permissionId: 'p-2',
      }),
    ]);
  });
});
