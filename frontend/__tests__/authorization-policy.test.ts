/**
 * Pure In-Process Unit Tests for AuthorizationPolicy & Capability Helpers.
 * Decoupled from React and Ant Design icons.
 */

import {
  hasPermission,
  isPlatformSuperAdmin,
  isExecutiveAdmin,
  isOperator,
  isSales,
  isAccountant,
  isCeoAdmin,
  hasExactRole,
  canApproveDossier,
  canManageUsers,
  canAccessFinancialHub,
  canManageOrganizations,
  canManageCustomers,
  canViewCustomers,
  canManageSuppliers,
  canViewSuppliers,
  canManageTasks,
  canViewTasks,
  canViewDossiers,
  canAccessRoutePolicy,
  isPathAccessiblePolicy,
  getAccessibleRoutesPolicy,
  getRouteMetaPolicy,
  getActiveMenuKeyPolicy,
  ROUTE_POLICY_DEFINITIONS,
  RoutePolicyDefinition,
  UserContext,
} from '@/lib/authorization-policy';
import { useAuthStore } from '@/lib/stores/auth-store';

describe('AuthorizationPolicy Module', () => {
  // ==========================================================================
  // 1. .manage -> .view Permission Parity with Backend
  // ==========================================================================
  describe('hasPermission parity with backend permission.util', () => {
    it('returns false for null, undefined, or empty permissions', () => {
      expect(hasPermission(null, 'customer.view')).toBe(false);
      expect(hasPermission(undefined, 'customer.view')).toBe(false);
      expect(hasPermission([], 'customer.view')).toBe(false);
    });

    it('returns true for exact permission match', () => {
      expect(hasPermission(['customer.view'], 'customer.view')).toBe(true);
      expect(hasPermission(['task.manage', 'user.view'], 'user.view')).toBe(true);
    });

    it('returns true for wildcard "*" permission', () => {
      expect(hasPermission(['*'], 'customer.view')).toBe(true);
      expect(hasPermission(['*'], 'any.arbitrary.permission')).toBe(true);
    });

    it('hierarchical RBAC: .manage automatically grants .view (1:1 with backend)', () => {
      expect(hasPermission(['customer.manage'], 'customer.view')).toBe(true);
      expect(hasPermission(['supplier.manage'], 'supplier.view')).toBe(true);
      expect(hasPermission(['task.manage'], 'task.view')).toBe(true);
      expect(hasPermission(['user.manage'], 'user.view')).toBe(true);
      expect(hasPermission(['document.manage'], 'document.view')).toBe(true);
      expect(hasPermission(['finance.manage'], 'finance.view')).toBe(true);
      expect(hasPermission(['dossier.manage'], 'dossier.view')).toBe(true);
    });

    it('does NOT grant .manage if user only has .view (no escalation)', () => {
      expect(hasPermission(['customer.view'], 'customer.manage')).toBe(false);
      expect(hasPermission(['task.view'], 'task.manage')).toBe(false);
      expect(hasPermission(['user.view'], 'user.manage')).toBe(false);
    });

    it('does NOT grant cross-module permissions', () => {
      expect(hasPermission(['customer.manage'], 'supplier.view')).toBe(false);
      expect(hasPermission(['task.manage'], 'user.view')).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Semantic Capability Helpers (Expand Phase)
  // ==========================================================================
  describe('Semantic Capability Helpers', () => {
    const superAdminUser: UserContext = {
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      isSuperAdmin: true,
      isCeoAdmin: true,
    };

    const ceoAdminUser: UserContext = {
      roles: ['CEO_ADMIN'],
      permissions: ['*'],
      isSuperAdmin: false,
      isCeoAdmin: true,
    };

    const operatorUser: UserContext = {
      roles: ['OPERATOR'],
      permissions: [
        'dossier.view.all',
        'dossier.approve',
        'supplier.manage',
        'task.manage',
        'import.manage',
      ],
      isOperator: true,
    };

    const salesUser: UserContext = {
      roles: ['SALES'],
      permissions: [
        'dossier.view.own',
        'dossier.create',
        'customer.manage',
        'task.manage',
      ],
      isSales: true,
    };

    const accountantUser: UserContext = {
      roles: ['ACCOUNTANT'],
      permissions: ['finance.manage', 'report.view'],
    };

    describe('isPlatformSuperAdmin', () => {
      it('returns true ONLY for exact SUPER_ADMIN role', () => {
        expect(isPlatformSuperAdmin(superAdminUser)).toBe(true);
        expect(isPlatformSuperAdmin(ceoAdminUser)).toBe(false);
        expect(isPlatformSuperAdmin(operatorUser)).toBe(false);
        expect(isPlatformSuperAdmin(salesUser)).toBe(false);
        expect(isPlatformSuperAdmin(null)).toBe(false);
      });

      it('does NOT treat CEO_ADMIN as platform super admin even with isSuperAdmin UI flag', () => {
        const ambiguousUser: UserContext = {
          roles: ['CEO_ADMIN'],
          isSuperAdmin: true,
        };
        expect(isPlatformSuperAdmin(ambiguousUser)).toBe(false);
      });
    });

    describe('isExecutiveAdmin', () => {
      it('returns true for both SUPER_ADMIN and CEO_ADMIN', () => {
        expect(isExecutiveAdmin(superAdminUser)).toBe(true);
        expect(isExecutiveAdmin(ceoAdminUser)).toBe(true);
      });

      it('returns false for OPERATOR, SALES, and ACCOUNTANT', () => {
        expect(isExecutiveAdmin(operatorUser)).toBe(false);
        expect(isExecutiveAdmin(salesUser)).toBe(false);
        expect(isExecutiveAdmin(accountantUser)).toBe(false);
        expect(isExecutiveAdmin(null)).toBe(false);
      });
    });

    describe('hasExactRole (strict without SUPER_ADMIN escalation)', () => {
      it('checks exact presence without super admin escalation', () => {
        expect(hasExactRole(superAdminUser, 'SUPER_ADMIN')).toBe(true);
        expect(hasExactRole(superAdminUser, 'ACCOUNTANT')).toBe(false);
        expect(hasExactRole(superAdminUser, 'SALES')).toBe(false);

        expect(hasExactRole(accountantUser, 'ACCOUNTANT')).toBe(true);
        expect(hasExactRole(accountantUser, 'OPERATOR')).toBe(false);
      });

      it('supports checking an array of roles', () => {
        expect(hasExactRole(operatorUser, ['OPERATOR', 'SALES'])).toBe(true);
        expect(hasExactRole(accountantUser, ['OPERATOR', 'SALES'])).toBe(false);
      });
    });

    describe('canApproveDossier', () => {
      it('allows executive admins (SUPER_ADMIN, CEO_ADMIN)', () => {
        expect(canApproveDossier(superAdminUser)).toBe(true);
        expect(canApproveDossier(ceoAdminUser)).toBe(true);
      });

      it('allows users with dossier.approve or contract.approve', () => {
        expect(canApproveDossier(operatorUser)).toBe(true);
        expect(
          canApproveDossier({ roles: ['STAFF'], permissions: ['contract.approve'] }),
        ).toBe(true);
      });

      it('denies users without approval rights', () => {
        expect(canApproveDossier(salesUser)).toBe(false);
        expect(canApproveDossier(accountantUser)).toBe(false);
      });
    });

    describe('canManageUsers', () => {
      it('allows executive admins and users with user.manage', () => {
        expect(canManageUsers(superAdminUser)).toBe(true);
        expect(canManageUsers(ceoAdminUser)).toBe(true);
        expect(canManageUsers({ roles: ['HR'], permissions: ['user.manage'] })).toBe(
          true,
        );
      });

      it('denies operator and sales by default', () => {
        expect(canManageUsers(operatorUser)).toBe(false);
        expect(canManageUsers(salesUser)).toBe(false);
      });
    });

    describe('canAccessFinancialHub', () => {
      it('allows executive admins and accountants', () => {
        expect(canAccessFinancialHub(superAdminUser)).toBe(true);
        expect(canAccessFinancialHub(ceoAdminUser)).toBe(true);
        expect(canAccessFinancialHub(accountantUser)).toBe(true);
      });

      it('allows users with finance permissions', () => {
        expect(
          canAccessFinancialHub({ roles: ['CLERK'], permissions: ['finance.view'] }),
        ).toBe(true);
        expect(
          canAccessFinancialHub({
            roles: ['AUDITOR'],
            permissions: ['dossier.cost.view'],
          }),
        ).toBe(true);
      });

      it('denies standard sales without financial permissions', () => {
        expect(canAccessFinancialHub(salesUser)).toBe(false);
      });
    });

    describe('canManageOrganizations', () => {
      it('is strictly restricted to platform super admin', () => {
        expect(canManageOrganizations(superAdminUser)).toBe(true);
        expect(canManageOrganizations(ceoAdminUser)).toBe(false);
        expect(canManageOrganizations(operatorUser)).toBe(false);
        expect(canManageOrganizations(salesUser)).toBe(false);
      });
    });

    describe('domain resource helpers (canManage / canView)', () => {
      it('verifies customer permissions with .manage -> .view implication', () => {
        expect(canManageCustomers(salesUser)).toBe(true);
        expect(canViewCustomers(salesUser)).toBe(true);

        const viewOnlyUser: UserContext = {
          roles: ['INTERN'],
          permissions: ['customer.view'],
        };
        expect(canManageCustomers(viewOnlyUser)).toBe(false);
        expect(canViewCustomers(viewOnlyUser)).toBe(true);
      });

      it('verifies supplier permissions with .manage -> .view implication', () => {
        expect(canManageSuppliers(operatorUser)).toBe(true);
        expect(canViewSuppliers(operatorUser)).toBe(true);
        expect(canManageSuppliers(salesUser)).toBe(false);
      });

      it('verifies task permissions', () => {
        expect(canManageTasks(operatorUser)).toBe(true);
        expect(canViewTasks(operatorUser)).toBe(true);
        expect(canManageTasks(salesUser)).toBe(true);
        expect(canViewTasks(salesUser)).toBe(true);
      });

      it('verifies dossier view capabilities across view scopes', () => {
        expect(canViewDossiers(operatorUser)).toBe(true);
        expect(canViewDossiers(salesUser)).toBe(true);
        expect(canViewDossiers(accountantUser)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // 3. Pure Route Policy Evaluation (In-Process, Decoupled from React Icons)
  // ==========================================================================
  describe('Pure Route Policy Evaluation', () => {
    const superAdminCtx: UserContext = {
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      isSuperAdmin: true,
      isCeoAdmin: true,
    };

    const ceoAdminCtx: UserContext = {
      roles: ['CEO_ADMIN'],
      permissions: ['*'],
      isSuperAdmin: false,
      isCeoAdmin: true,
    };

    const operatorCtx: UserContext = {
      roles: ['OPERATOR'],
      permissions: [
        'dossier.view.all',
        'supplier.manage',
        'task.manage',
        'import.manage',
      ],
      isOperator: true,
      isSales: false,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    const salesCtx: UserContext = {
      roles: ['SALES'],
      permissions: [
        'dossier.view.own',
        'customer.manage',
        'task.manage',
        'import.manage',
      ],
      isOperator: false,
      isSales: true,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    const accountantCtx: UserContext = {
      roles: ['ACCOUNTANT'],
      permissions: ['finance.manage', 'report.view'],
    };

    it('canAccessRoutePolicy: enforces superAdminOnly strictly on /organizations', () => {
      const orgRoute = ROUTE_POLICY_DEFINITIONS.find(
        (r) => r.path === '/organizations',
      )!;
      expect(canAccessRoutePolicy(orgRoute, superAdminCtx)).toBe(true);
      expect(canAccessRoutePolicy(orgRoute, ceoAdminCtx)).toBe(false);
      expect(canAccessRoutePolicy(orgRoute, operatorCtx)).toBe(false);
      expect(canAccessRoutePolicy(orgRoute, salesCtx)).toBe(false);
      expect(canAccessRoutePolicy(orgRoute, accountantCtx)).toBe(false);
    });

    it('canAccessRoutePolicy: evaluates route accessibility for ACCOUNTANT', () => {
      const orgRoute = ROUTE_POLICY_DEFINITIONS.find((r) => r.path === '/organizations')!;
      expect(canAccessRoutePolicy(orgRoute, accountantCtx)).toBe(false);

      const profileRoute = ROUTE_POLICY_DEFINITIONS.find((r) => r.path === '/profile')!;
      expect(canAccessRoutePolicy(profileRoute, accountantCtx)).toBe(true);
    });

    it('canAccessRoutePolicy: allows route access when user has .manage and route requires .view', () => {
      const customRoute: RoutePolicyDefinition = {
        key: '/custom-view',
        path: '/custom-view',
        label: 'Custom View',
        title: 'Custom View',
        subtitle: 'Sub',
        requiredPermissions: ['customer.view'],
        order: 99,
      };

      // User has customer.manage -> .manage implies .view -> access granted!
      const managerCtx: UserContext = {
        roles: ['SALES_MANAGER'],
        permissions: ['customer.manage'],
      };
      expect(canAccessRoutePolicy(customRoute, managerCtx)).toBe(true);

      const unauthorizedCtx: UserContext = {
        roles: ['GUEST'],
        permissions: ['supplier.manage'],
      };
      expect(canAccessRoutePolicy(customRoute, unauthorizedCtx)).toBe(false);
    });

    it('getAccessibleRoutesPolicy: returns sorted, permitted routes without any icon rendering', () => {
      const operatorRoutes = getAccessibleRoutesPolicy(operatorCtx);
      const paths = operatorRoutes.map((r) => r.path);

      expect(paths).toContain('/suppliers');
      expect(paths).toContain('/tasks');
      expect(paths).toContain('/imports');
      expect(paths).not.toContain('/customers');
      expect(paths).not.toContain('/organizations');

      // Check sorting by order
      for (let i = 0; i < operatorRoutes.length - 1; i++) {
        expect(operatorRoutes[i].order).toBeLessThanOrEqual(
          operatorRoutes[i + 1].order,
        );
      }
    });

    it('isPathAccessiblePolicy: handles deep-links and legacy /main/ prefix', () => {
      expect(
        isPathAccessiblePolicy('/dossiers/123-abc-uuid', operatorCtx),
      ).toBe(true);
      expect(
        isPathAccessiblePolicy('/main/dossiers/123-abc-uuid', salesCtx),
      ).toBe(true);

      expect(
        isPathAccessiblePolicy('/organizations/new', superAdminCtx),
      ).toBe(true);
      expect(isPathAccessiblePolicy('/organizations/new', ceoAdminCtx)).toBe(
        false,
      );
      expect(isPathAccessiblePolicy('/organizations/new', salesCtx)).toBe(
        false,
      );
    });

    it('getRouteMetaPolicy: computes dynamic metadata without React icons', () => {
      const meta = getRouteMetaPolicy('/dossiers', operatorCtx);
      expect(meta.title).toBe('Hồ sơ chờ xử lý');

      const salesMeta = getRouteMetaPolicy('/dossiers', salesCtx);
      expect(salesMeta.title).toBe('Hồ sơ của tôi');

      const ceoMeta = getRouteMetaPolicy('/tasks', ceoAdminCtx);
      expect(ceoMeta.title).toBe('Lịch trình điều hành');
    });

    it('getActiveMenuKeyPolicy: collapses sub-routes to parent hub key', () => {
      expect(getActiveMenuKeyPolicy('/reports')).toBe('/reports');
      expect(getActiveMenuKeyPolicy('/revenue')).toBe('/reports');
      expect(getActiveMenuKeyPolicy('/kpi')).toBe('/reports');
      expect(getActiveMenuKeyPolicy('/main/revenue')).toBe('/reports');
      expect(getActiveMenuKeyPolicy('/dossiers/xyz-123')).toBe('/dossiers');
      expect(getActiveMenuKeyPolicy('/dashboard')).toBe('/dashboard');
      expect(getActiveMenuKeyPolicy(null)).toBe('/dashboard');
    });
  });

  // ==========================================================================
  // 4. useAuthStore Capability Integration
  // ==========================================================================
  describe('useAuthStore capability integration', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        hasHydrated: true,
      });
    });

    it('delegates hasPermission with .manage -> .view parity through the store', () => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'sales@skylux.vn',
          fullName: 'Sales Lead',
          roles: ['SALES'],
          permissions: ['customer.manage'],
        } as any,
        isAuthenticated: true,
      });

      const store = useAuthStore.getState();
      expect(store.hasPermission('customer.view')).toBe(true);
      expect(store.hasPermission('customer.manage')).toBe(true);
      expect(store.hasPermission('supplier.view')).toBe(false);
    });

    it('exposes semantic capabilities on the Zustand store instance', () => {
      useAuthStore.setState({
        user: {
          id: 'u2',
          email: 'ceo@skylux.vn',
          fullName: 'CEO Admin',
          roles: ['CEO_ADMIN'],
          permissions: ['*'],
        } as any,
        isAuthenticated: true,
      });

      const store = useAuthStore.getState();
      expect(store.isPlatformSuperAdmin()).toBe(false);
      expect(store.isExecutiveAdmin()).toBe(true);
      expect(store.isCeoAdmin()).toBe(true);
      expect(store.hasExactRole('CEO_ADMIN')).toBe(true);
      expect(store.hasExactRole('SUPER_ADMIN')).toBe(false);
      expect(store.isSuperAdmin()).toBe(false); // Contracted: false for CEO_ADMIN
      expect(store.canApproveDossier()).toBe(true);
      expect(store.canManageUsers()).toBe(true);
      expect(store.canAccessFinancialHub()).toBe(true);
      expect(store.canManageOrganizations()).toBe(false);
    });

    it('contracts isSuperAdmin() to return true strictly for SUPER_ADMIN only', () => {
      useAuthStore.setState({
        user: {
          id: 'u-super',
          email: 'admin@skylux.vn',
          fullName: 'Super Admin',
          roles: ['SUPER_ADMIN'],
          permissions: ['*'],
        } as any,
        isAuthenticated: true,
      });

      const store = useAuthStore.getState();
      expect(store.isSuperAdmin()).toBe(true);
      expect(store.isPlatformSuperAdmin()).toBe(true);
      expect(store.isExecutiveAdmin()).toBe(true);
      expect(store.isCeoAdmin()).toBe(false);
      expect(store.canManageOrganizations()).toBe(true);
    });

    it('contracts hasRole() to verify exact role without SUPER_ADMIN spoofing other roles', () => {
      useAuthStore.setState({
        user: {
          id: 'u-super-strict',
          email: 'admin@skylux.vn',
          fullName: 'Super Admin Strict',
          roles: ['SUPER_ADMIN'],
          permissions: ['*'],
        } as any,
        isAuthenticated: true,
      });

      const store = useAuthStore.getState();
      expect(store.hasRole('SUPER_ADMIN')).toBe(true);
      expect(store.hasRole(['SUPER_ADMIN', 'CEO_ADMIN'])).toBe(true);
      // Contracted: does not spoof other roles
      expect(store.hasRole('OPERATOR')).toBe(false);
      expect(store.hasRole('SALES')).toBe(false);
      expect(store.hasRole('ACCOUNTANT')).toBe(false);
      expect(store.isOperator()).toBe(false);
      expect(store.isSales()).toBe(false);
      expect(store.isAccountant()).toBe(false);
    });

    it('evaluates semantic role helpers across OPERATOR, SALES, and ACCOUNTANT', () => {
      // OPERATOR
      useAuthStore.setState({
        user: { id: 'u-op', roles: ['OPERATOR'], permissions: [] } as any,
        isAuthenticated: true,
      });
      let store = useAuthStore.getState();
      expect(store.isOperator()).toBe(true);
      expect(store.isSales()).toBe(false);
      expect(store.isAccountant()).toBe(false);
      expect(store.isExecutiveAdmin()).toBe(false);

      // SALES
      useAuthStore.setState({
        user: { id: 'u-sales', roles: ['SALES'], permissions: [] } as any,
        isAuthenticated: true,
      });
      store = useAuthStore.getState();
      expect(store.isSales()).toBe(true);
      expect(store.isOperator()).toBe(false);
      expect(store.isAccountant()).toBe(false);
      expect(store.isExecutiveAdmin()).toBe(false);

      // ACCOUNTANT
      useAuthStore.setState({
        user: { id: 'u-acc', roles: ['ACCOUNTANT'], permissions: [] } as any,
        isAuthenticated: true,
      });
      store = useAuthStore.getState();
      expect(store.isAccountant()).toBe(true);
      expect(store.isSales()).toBe(false);
      expect(store.isOperator()).toBe(false);
      expect(store.canAccessFinancialHub()).toBe(true);
    });
  });
});
