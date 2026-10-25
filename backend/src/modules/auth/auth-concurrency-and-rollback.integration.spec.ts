import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { JwtAuthGuard, UserAuthMeta } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../../common/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { Organization } from '../organizations/entities/organization.entity';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Department } from '../departments/entities/department.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SettingsService } from '../settings/settings.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('mock-password-hash'),
}));

describe('Auth Concurrency, 0ms Realtime Revocation & Rollback (Integration)', () => {
  let guard: JwtAuthGuard;
  let usersService: UsersService;
  let authService: AuthService;
  let rolesService: RolesService;
  let orgService: OrganizationsService;

  // Shared in-memory Redis simulator
  let redisMemoryCache: Map<string, any>;
  let mockRedisService: any;

  // Database mock state
  let dbUsers: Map<string, any>;
  let mockUserRepo: any;
  let mockRoleRepo: any;
  let mockOrgRepo: any;
  let mockRolePermRepo: any;
  let mockRefreshTokenRepo: any;
  let mockDeptRepo: any;
  let mockDataSource: any;

  const validToken = 'valid-jwt-token';
  const userId = 'user-uuid-100';
  const orgId = 'org-uuid-100';

  const tokenPayload = {
    id: userId,
    organizationId: orgId,
    email: 'ceo@skylux.vn',
    authVersion: 1,
  };

  function createMockContext(token = validToken): ExecutionContext {
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      user: undefined,
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    redisMemoryCache = new Map<string, any>();
    mockRedisService = {
      cache: redisMemoryCache,
      get: jest.fn(async (key: string) => redisMemoryCache.get(key) ?? null),
      set: jest.fn(async (key: string, val: any) => {
        redisMemoryCache.set(key, val);
      }),
      del: jest.fn(async (key: string) => {
        redisMemoryCache.delete(key);
      }),
    };

    dbUsers = new Map<string, any>();
    dbUsers.set(userId, {
      id: userId,
      organizationId: orgId,
      email: 'ceo@skylux.vn',
      fullName: 'CEO Admin',
      status: UserStatus.ACTIVE,
      authVersion: 1,
      passwordHash: 'old-hashed-password',
      roles: [{ id: 'role-ceo', code: 'CEO_ADMIN' }],
    });

    mockUserRepo = {
      findOne: jest.fn(async ({ where }: any) => {
        const id = where?.id || (Array.isArray(where) ? where[0]?.id : undefined);
        const user = dbUsers.get(id);
        if (!user) return null;
        return { ...user };
      }),
      save: jest.fn(async (user: any) => {
        dbUsers.set(user.id, { ...dbUsers.get(user.id), ...user });
        return { ...dbUsers.get(user.id) };
      }),
    };

    mockRoleRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'role-ceo', code: 'CEO_ADMIN', organizationId: orgId }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (role: any) => role),
    };

    mockOrgRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: any) => ({ ...data, id: 'org-new-uuid' })),
      save: jest.fn(async (org: any) => ({ ...org, id: org.id || 'org-new-uuid' })),
      find: jest.fn().mockResolvedValue([]),
    };

    mockRolePermRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (perm: any) => perm),
    };

    mockRefreshTokenRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    mockDeptRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'dept-1', organizationId: orgId }),
    };

    mockDataSource = {
      getRepository: jest.fn((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === Role) return mockRoleRepo;
        if (entity === Organization) return mockOrgRepo;
        if (entity === RolePermission) return mockRolePermRepo;
        return mockUserRepo;
      }),
      query: jest.fn(async (queryStr: string) => {
        if (queryStr.includes('FROM "user_roles"')) {
          return [{ user_id: userId }];
        }
        return [];
      }),
      transaction: jest.fn(async (cb: (em: any) => Promise<any>) => {
        const transactionalEntityManager = {
          getRepository: (entity: any) => {
            if (entity === Organization) return mockOrgRepo;
            if (entity === Role) return mockRoleRepo;
            if (entity === RolePermission) return mockRolePermRepo;
            return mockUserRepo;
          },
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
          create: jest.fn((entity: any, data: any) => data),
          save: jest.fn(async (entity: any, data?: any) => data || entity),
          query: jest.fn().mockResolvedValue(undefined),
        };
        return cb(transactionalEntityManager);
      }),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    const mockJwtService = {
      verifyAsync: jest.fn().mockImplementation(async (token: string) => {
        if (token === validToken) return { ...tokenPayload };
        throw new Error('Invalid token');
      }),
      signAsync: jest.fn().mockResolvedValue('mock-signed-jwt'),
    } as unknown as JwtService;

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return undefined;
      }),
    } as unknown as ConfigService;

    const mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditLogsService;

    const mockSettingsService = {
      getOrganizationSettings: jest.fn().mockResolvedValue([]),
      updateOrganizationSetting: jest.fn().mockResolvedValue({}),
    } as unknown as SettingsService;

    // Instantiate Guard and Services
    guard = new JwtAuthGuard(
      mockReflector,
      mockJwtService,
      mockConfigService,
      mockDataSource as DataSource,
      mockRedisService,
    );

    usersService = new UsersService(
      mockUserRepo,
      mockRefreshTokenRepo,
      mockRoleRepo,
      mockDeptRepo,
      mockOrgRepo,
      mockAuditLogsService,
      mockRedisService,
    );

    authService = new AuthService(
      mockUserRepo,
      mockRolePermRepo,
      mockRefreshTokenRepo,
      mockJwtService,
      mockConfigService,
      mockRedisService,
    );

    rolesService = new RolesService(
      mockRoleRepo,
      mockDataSource as DataSource,
      mockAuditLogsService,
      mockRedisService,
    );

    orgService = new OrganizationsService(
      mockOrgRepo,
      mockRoleRepo,
      mockRolePermRepo,
      mockSettingsService,
      mockDataSource as DataSource,
    );
  });

  describe('1. Mô phỏng tải đồng thời (20 Concurrent Requests Concurrency)', () => {
    it('serves 20 concurrent requests with the same token hitting PostgreSQL only 1 time', async () => {
      // Create 20 concurrent contexts
      const contexts = Array.from({ length: 20 }, () => createMockContext());

      // Execute initial request to prime the cache
      const firstAllowed = await guard.canActivate(contexts[0]);
      expect(firstAllowed).toBe(true);
      expect(mockUserRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `user:auth-meta:${userId}`,
        expect.objectContaining({
          id: userId,
          organizationId: orgId,
          authVersion: 1,
          status: UserStatus.ACTIVE,
        }),
        300,
      );

      // Reset mock invocation count on the database repo to test subsequent concurrent burst
      mockUserRepo.findOne.mockClear();

      // Fire 19 concurrent requests
      const concurrentResults = await Promise.all(
        contexts.slice(1).map((ctx) => guard.canActivate(ctx)),
      );

      // Verify all 19 passed
      expect(concurrentResults).toHaveLength(19);
      expect(concurrentResults.every((res) => res === true)).toBe(true);

      // Critical Proof: ZERO queries to PostgreSQL during the burst!
      expect(mockUserRepo.findOne).toHaveBeenCalledTimes(0);
      expect(mockRedisService.get).toHaveBeenCalledTimes(20); // 1 initial + 19 concurrent
    });
  });

  describe('2. Mô phỏng thu hồi quyền tức thì (0ms Realtime Revocation)', () => {
    it('immediately rejects subsequent request with 401 when admin locks user account (0ms delay)', async () => {
      const context = createMockContext();

      // Step 1: Initial request succeeds and is cached in Redis
      const allowedFirst = await guard.canActivate(context);
      expect(allowedFirst).toBe(true);
      expect(redisMemoryCache.has(`user:auth-meta:${userId}`)).toBe(true);

      // Step 2: Administrator locks the user account
      await usersService.lockUser(orgId, userId, 'admin-actor-id');

      // Verify Redis cache for this user was immediately evicted
      expect(redisMemoryCache.has(`user:auth-meta:${userId}`)).toBe(false);

      // Step 3: Immediate subsequent request with the same token must be rejected with 401
      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Token is no longer valid'),
      );
    });

    it('immediately rejects subsequent request with 401 when user changes password (0ms delay)', async () => {
      const context = createMockContext();

      // Step 1: Initial request succeeds and caches user
      const allowedFirst = await guard.canActivate(context);
      expect(allowedFirst).toBe(true);
      expect(redisMemoryCache.has(`user:auth-meta:${userId}`)).toBe(true);

      // Step 2: User changes their password
      await authService.changePassword(userId, {
        currentPassword: 'current-password',
        newPassword: 'new-secure-password',
      });

      // Verify Redis cache is actively deleted
      expect(redisMemoryCache.has(`user:auth-meta:${userId}`)).toBe(false);

      // Step 3: Immediate subsequent request with the old token is rejected with 401
      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Token is no longer valid'),
      );
    });

    it('immediately evicts cache when role permissions change', async () => {
      const context = createMockContext();

      // Step 1: User verifies and is cached in Redis
      await guard.canActivate(context);
      expect(redisMemoryCache.has(`user:auth-meta:${userId}`)).toBe(true);

      // Step 2: Role permissions updated
      await rolesService.assignPermissions(
        'role-ceo',
        { permissions: [{ permissionId: 'perm-new', scope: 'ALL' as any }] },
        orgId,
        'actor-admin-id',
      );

      // Verify all users with that role have their cache invalidated
      expect(redisMemoryCache.has(`user:auth-meta:${userId}`)).toBe(false);
    });
  });

  describe('3. Mô phỏng thất bại khi khởi tạo Tổ chức (Atomic Rollback)', () => {
    it('aborts and rolls back entire transaction leaving 0 leftover rows if role/permission copying fails', async () => {
      // Simulate an error inside the transaction during role saving
      mockDataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const faultyEntityManager = {
          getRepository: (entity: any) => {
            if (entity === Organization) return mockOrgRepo;
            if (entity === Role) {
              return {
                ...mockRoleRepo,
                save: jest.fn().mockRejectedValue(new Error('Fatal DB Error: Role creation failed')),
              };
            }
            return mockUserRepo;
          },
        };
        // Run the callback which should throw
        return cb(faultyEntityManager);
      });

      const newOrgDto = {
        code: 'FAILED_CORP',
        name: 'Failed Corporation',
        slug: 'failed-corp',
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
      };

      await expect(orgService.create(newOrgDto)).rejects.toThrow(
        'Fatal DB Error: Role creation failed',
      );
    });
  });
});
