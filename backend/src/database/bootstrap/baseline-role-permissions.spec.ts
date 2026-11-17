import { BASELINE_ROLE_PERMISSIONS } from './baseline-role-permissions';
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
});
