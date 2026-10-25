import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('RolesGuard (Hierarchical RBAC)', () => {
  let guard: RolesGuard;
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

    guard = new RolesGuard(reflector, configService);
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

  it('should allow access if route is public', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if no roles are required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return undefined;
      return undefined;
    });

    const context = createMockContext({ id: 'u1', roles: ['SALES'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if user is not in request', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['SALES'];
      return undefined;
    });

    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user has no roles assigned', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['SALES'];
      return undefined;
    });

    const context = createMockContext({ id: 'u1', roles: null });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow SUPER_ADMIN on any required role (universal bypass)', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['OPERATOR', 'SALES'];
      return undefined;
    });

    const context = createMockContext({ id: 'u1', roles: ['SUPER_ADMIN'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow SUPER_ADMIN on @Roles("SUPER_ADMIN")', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['SUPER_ADMIN'];
      return undefined;
    });

    const context = createMockContext({ id: 'u1', roles: ['SUPER_ADMIN'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should REJECT CEO_ADMIN on @Roles("SUPER_ADMIN") (strict hierarchy)', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['SUPER_ADMIN'];
      return undefined;
    });

    const context = createMockContext({ id: 'u2', roles: ['CEO_ADMIN'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Access denied: Required one of roles [SUPER_ADMIN]',
    );
  });

  it('should ALLOW CEO_ADMIN on operational roles (e.g. OPERATOR or SALES)', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['OPERATOR'];
      return undefined;
    });

    const context = createMockContext({ id: 'u2', roles: ['CEO_ADMIN'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should ALLOW CEO_ADMIN when endpoint includes CEO_ADMIN in required roles', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['CEO_ADMIN', 'SUPER_ADMIN'];
      return undefined;
    });

    const context = createMockContext({ id: 'u2', roles: ['CEO_ADMIN'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow standard operational user with matching role', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['OPERATOR', 'SALES'];
      return undefined;
    });

    const context = createMockContext({ id: 'u3', roles: ['SALES'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject standard operational user without matching role', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['OPERATOR'];
      return undefined;
    });

    const context = createMockContext({ id: 'u3', roles: ['SALES'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
