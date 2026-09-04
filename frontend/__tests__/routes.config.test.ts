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
  UserContext,
} from '@/lib/routes.config';

describe('routes.config - Permission-Driven Dynamic Navigation', () => {
  it('OPERATOR: includes /main/suppliers and excludes /main/customers', () => {
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

    expect(paths).toContain('/main/suppliers');
    expect(paths).not.toContain('/main/customers');
    expect(paths).toContain('/main/imports');
    expect(paths).toContain('/main/sales');
    expect(paths).toContain('/main/revenue');
    expect(paths).toContain('/main/dashboard');
  });

  it('SALES: includes /main/customers and excludes /main/suppliers and /main/approvals', () => {
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

    expect(paths).toContain('/main/customers');
    expect(paths).toContain('/main/imports');
    expect(paths).toContain('/main/dossiers');
    expect(paths).not.toContain('/main/suppliers');
    expect(paths).not.toContain('/main/approvals');
    expect(paths).not.toContain('/main/users');
    expect(paths).not.toContain('/main/settings');
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

    expect(paths).toContain('/main/users');
    expect(paths).toContain('/main/settings');
    expect(paths).toContain('/main/audit-logs');
    expect(paths).toContain('/main/reports');
    expect(paths).toContain('/main/approvals');
    expect(paths).toContain('/main/revenue');
    expect(paths).toContain('/main/kpi');
  });

  it('getActiveMenuKey: fixes the bug where /main/suppliers highlighted /main/customers', () => {
    expect(getActiveMenuKey('/main/suppliers')).toBe('/main/suppliers');
    expect(getActiveMenuKey('/main/customers')).toBe('/main/customers');
    expect(getActiveMenuKey('/main/dossiers/123-abc')).toBe('/main/dossiers');
    expect(getActiveMenuKey('/main/dashboard')).toBe('/main/dashboard');
  });

  it('getRouteMeta: provides dynamic titles based on user context', () => {
    const operatorCtx: UserContext = {
      isOperator: true,
      isSales: false,
      isCeoAdmin: false,
    };

    const meta = getRouteMeta('/main/dossiers', operatorCtx);
    expect(meta.title).toBe('Hồ sơ chờ xử lý');

    const salesCtx: UserContext = {
      isOperator: false,
      isSales: true,
      isCeoAdmin: false,
    };

    const salesMeta = getRouteMeta('/main/dossiers', salesCtx);
    expect(salesMeta.title).toBe('Hồ sơ của tôi');

    const supplierMeta = getRouteMeta('/main/suppliers', operatorCtx);
    expect(supplierMeta.title).toBe('Nhà cung cấp');
  });
});
