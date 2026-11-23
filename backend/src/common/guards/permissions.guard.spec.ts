import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('PermissionsGuard (Config-driven Admin Roles & Permission Checks)', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.adminRoles') return ['SUPER_ADMIN', 'CEO_ADMIN'];
        return null;
      }),
    } as any;

    guard = new PermissionsGuard(reflector, configService);
  });

  function createMockContext(user?: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  }

  it('allows access if route is public', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access if no permissions are required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return undefined;
      return undefined;
    });

    const context = createMockContext({ id: 'u1', roles: ['SALES'], permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException if user session is missing', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['user.manage'];
      return undefined;
    });

    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows SUPER_ADMIN bypass based on config-driven app.adminRoles', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['system.root.manage'];
      return undefined;
    });

    const context = createMockContext({ id: 'u1', roles: ['SUPER_ADMIN'], permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows CEO_ADMIN bypass based on config-driven app.adminRoles', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['contract.approve', 'finance.manage'];
      return undefined;
    });

    const context = createMockContext({ id: 'u2', roles: ['CEO_ADMIN'], permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows non-admin user with exact matching permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['dossier.view', 'customer.view'];
      return undefined;
    });

    const context = createMockContext({
      id: 'u3',
      roles: ['SALES'],
      permissions: ['dossier.view', 'customer.view'],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows non-admin user when module.manage implies module.view', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['dossier.view'];
      return undefined;
    });

    const context = createMockContext({
      id: 'u4',
      roles: ['OPERATOR'],
      permissions: ['dossier.manage'],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when non-admin user lacks required permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === PERMISSIONS_KEY) return ['contract.approve'];
      return undefined;
    });

    const context = createMockContext({
      id: 'u5',
      roles: ['SALES'],
      permissions: ['dossier.view'],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Access denied: Missing required permissions [contract.approve]',
    );
  });
});
