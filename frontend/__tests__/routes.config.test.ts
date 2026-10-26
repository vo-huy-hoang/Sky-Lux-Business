import React from 'react';

jest.mock('@ant-design/icons', () => ({
  DashboardOutlined: () => null,
  FolderOpenOutlined: () => null,
  UsergroupAddOutlined: () => null,
  FileExcelOutlined: () => null,
  CheckSquareOutlined: () => null,
  UserOutlined: () => null,
  MessageOutlined: () => null,
  CustomerServiceOutlined: () => null,
  TeamOutlined: () => null,
  AuditOutlined: () => null,
  BarChartOutlined: () => null,
  RiseOutlined: () => null,
  SettingOutlined: () => null,
  FileTextOutlined: () => null,
  HistoryOutlined: () => null,
}));

import {
  getAccessibleRoutes,
  getRouteMeta,
  getActiveMenuKey,
  isPathAccessible,
  UserContext,
} from '@/lib/routes.config';

describe('routes.config - Permission-Driven Dynamic Navigation', () => {
  it('OPERATOR: includes /suppliers and excludes /customers', () => {
    const operatorCtx: UserContext = {
      roles: ['OPERATOR'],
      permissions: [
        'dashboard.operator',
        'dossier.view.all',
        'dossier.view.team',
        'dossier.update',
        'dossier.approve',
        'estimate.view',
        'estimate.update',
        'supplier.manage',
        'task.manage',
        'chat.access',
        'master_data.view',
        'import.manage',
        'document.view',
      ],
      isOperator: true,
      isSales: false,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    const routes = getAccessibleRoutes(operatorCtx);
    const paths = routes.map((r) => r.path);

    expect(paths).toContain('/suppliers');
    expect(paths).not.toContain('/customers');
    expect(paths).toContain('/imports');
    expect(paths).toContain('/sales');
    expect(paths).toContain('/revenue');
    expect(paths).toContain('/dashboard');
  });

  it('SALES: includes /customers and excludes /suppliers and /approvals', () => {
    const salesCtx: UserContext = {
      roles: ['SALES'],
      permissions: [
        'dashboard.sales',
        'dossier.view.own',
        'dossier.view.team',
        'dossier.create',
        'dossier.update',
        'dossier.submit',
        'estimate.create',
        'estimate.update',
        'estimate.view',
        'customer.manage',
        'task.manage',
        'chat.access',
        'master_data.view',
        'kpi.manage',
        'import.manage',
        'document.view',
      ],
      isOperator: false,
      isSales: true,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    const routes = getAccessibleRoutes(salesCtx);
    const paths = routes.map((r) => r.path);

    expect(paths).toContain('/customers');
    expect(paths).toContain('/imports');
    expect(paths).toContain('/dossiers');
    expect(paths).not.toContain('/suppliers');
    expect(paths).not.toContain('/approvals');
    expect(paths).not.toContain('/users');
    expect(paths).not.toContain('/settings');
  });

  it('SUPER_ADMIN: has access to full administrative suite', () => {
    const superAdminCtx: UserContext = {
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      isOperator: false,
      isSales: false,
      isCeoAdmin: true,
      isSuperAdmin: true,
    };

    const routes = getAccessibleRoutes(superAdminCtx);
    const paths = routes.map((r) => r.path);

    expect(paths).toContain('/users');
    expect(paths).toContain('/settings');
    expect(paths).toContain('/audit-logs');
    expect(paths).toContain('/reports');
    expect(paths).toContain('/approvals');
    expect(paths).toContain('/revenue');
    expect(paths).toContain('/kpi');
  });

  it('getActiveMenuKey: highlights canonical and backward-compatible paths correctly', () => {
    expect(getActiveMenuKey('/suppliers')).toBe('/suppliers');
    expect(getActiveMenuKey('/customers')).toBe('/customers');
    expect(getActiveMenuKey('/dossiers/123-abc')).toBe('/dossiers');
    expect(getActiveMenuKey('/dashboard')).toBe('/dashboard');

    // Backward compatibility checks
    expect(getActiveMenuKey('/main/suppliers')).toBe('/suppliers');
    expect(getActiveMenuKey('/main/customers')).toBe('/customers');
    expect(getActiveMenuKey('/main/dossiers/123-abc')).toBe('/dossiers');
    expect(getActiveMenuKey('/main/dashboard')).toBe('/dashboard');
  });

  it('getRouteMeta: provides dynamic titles based on user context', () => {
    const operatorCtx: UserContext = {
      isOperator: true,
      isSales: false,
      isCeoAdmin: false,
    };

    const meta = getRouteMeta('/dossiers', operatorCtx);
    expect(meta.title).toBe('Hồ sơ chờ xử lý');

    const salesCtx: UserContext = {
      isOperator: false,
      isSales: true,
      isCeoAdmin: false,
    };

    const salesMeta = getRouteMeta('/dossiers', salesCtx);
    expect(salesMeta.title).toBe('Hồ sơ của tôi');

    const supplierMeta = getRouteMeta('/suppliers', operatorCtx);
    expect(supplierMeta.title).toBe('Nhà cung cấp');

    // Backward compatibility check with legacy /main
    const legacyMeta = getRouteMeta('/main/dossiers', operatorCtx);
    expect(legacyMeta.title).toBe('Hồ sơ chờ xử lý');
  });

  it('isPathAccessible: allows /dossiers/[id] for OPERATOR, SALES, CEO/Admin and denies unauthorized roles', () => {
    const salesCtx: UserContext = {
      isOperator: false,
      isSales: true,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    const operatorCtx: UserContext = {
      isOperator: true,
      isSales: false,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    const ceoCtx: UserContext = {
      isOperator: false,
      isSales: false,
      isCeoAdmin: true,
      isSuperAdmin: false,
    };

    const unauthorizedCtx: UserContext = {
      isOperator: false,
      isSales: false,
      isCeoAdmin: false,
      isSuperAdmin: false,
    };

    expect(isPathAccessible('/dossiers/dc6c0291-7bbd-4514', salesCtx)).toBe(true);
    expect(isPathAccessible('/dossiers/dc6c0291-7bbd-4514', operatorCtx)).toBe(true);
    expect(isPathAccessible('/dossiers/dc6c0291-7bbd-4514', ceoCtx)).toBe(true);
    expect(isPathAccessible('/dossiers/dc6c0291-7bbd-4514', unauthorizedCtx)).toBe(false);

    // Backward compatibility checks with /main/
    expect(isPathAccessible('/main/dossiers/dc6c0291-7bbd-4514', salesCtx)).toBe(true);
    expect(isPathAccessible('/main/dossiers/dc6c0291-7bbd-4514', unauthorizedCtx)).toBe(false);
  });

  it('CEO_ADMIN / SUPER_ADMIN: tasks route is labeled "Lịch trình điều hành"', () => {
    const ceoCtx: UserContext = {
      isOperator: false,
      isSales: false,
      isCeoAdmin: true,
      isSuperAdmin: false,
    };

    const meta = getRouteMeta('/tasks', ceoCtx);
    expect(meta.title).toBe('Lịch trình điều hành');
    expect(meta.subtitle).toBe('Theo dõi lịch trình các đoàn tour và dịch vụ toàn công ty');

    const accessible = getAccessibleRoutes(ceoCtx);
    const taskRoute = accessible.find((r) => r.path === '/tasks');
    expect(taskRoute).toBeDefined();
    expect(typeof taskRoute!.label === 'function' ? taskRoute!.label(ceoCtx) : taskRoute!.label).toBe('Lịch trình điều hành');
  });

  it('CEO_ADMIN: 14 menus ordered by CEO Mental Model and Decision Pyramid', () => {
    const ceoCtx: UserContext = {
      roles: ['CEO_ADMIN'],
      permissions: ['*'],
      isOperator: false,
      isSales: false,
      isCeoAdmin: true,
      isSuperAdmin: false,
    };

    const routes = getAccessibleRoutes(ceoCtx).filter(
      (route) => !route.hideFromNavigationRoles?.some((role) => ceoCtx.roles?.includes(role)),
    );
    const paths = routes.map((r) => r.path);

    expect(paths).toEqual([
      '/dashboard',
      '/approvals',
      '/tasks',
      '/dossiers',
      '/revenue',
      '/reports',
      '/kpi',
      '/customers',
      '/imports',
      '/messages',
      '/users',
      '/settings',
      '/audit-logs',
      '/profile',
    ]);
  });
});
