import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { JwtAuthGuard, UserAuthMeta } from './jwt-auth.guard';
import { User } from '../../modules/users/entities/user.entity';
import { UserStatus } from '../enums';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard (with Redis Cache & DB Fallback)', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: any;
  let mockUserRepo: any;
  let mockRedisService: any;

  const validPayload = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    email: 'user1@skylux.vn',
    authVersion: 1,
  };

  const activeUserMeta: UserAuthMeta = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    status: UserStatus.ACTIVE,
    authVersion: 1,
  };

  function createMockContext(authHeader?: string): ExecutionContext {
    const request = {
      headers: {
        authorization: authHeader,
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
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue(validPayload),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockUserRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        status: UserStatus.ACTIVE,
        authVersion: 1,
      }),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue(mockUserRepo),
    };

    mockRedisService = {
      cache: new Map<string, any>(),
      get: jest.fn(async (key: string) => mockRedisService.cache.get(key) ?? null),
      set: jest.fn(async (key: string, val: any) => {
        mockRedisService.cache.set(key, val);
      }),
    };

    guard = new JwtAuthGuard(
      reflector,
      jwtService,
      configService,
      dataSource as DataSource,
      mockRedisService,
    );
  });

  it('bypasses guard when route is marked @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(mockUserRepo.findOne).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing or invalid Authorization header'),
    );
  });

  it('throws UnauthorizedException when Authorization header does not start with Bearer', async () => {
    const context = createMockContext('Basic xyz');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing or invalid Authorization header'),
    );
  });

  it('serves auth verification directly from Redis cache without querying PostgreSQL (Cache Hit)', async () => {
    mockRedisService.cache.set('user:auth-meta:user-uuid-1', activeUserMeta);
    const context = createMockContext('Bearer valid-token');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockRedisService.get).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    // Database query was completely bypassed!
    expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual(validPayload);
  });

  it('queries database on cache miss, stores in Redis with 300s TTL, and allows request', async () => {
    const context = createMockContext('Bearer valid-token');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockRedisService.get).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    expect(mockUserRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      select: {
        id: true,
        organizationId: true,
        status: true,
        authVersion: true,
      },
    });
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'user:auth-meta:user-uuid-1',
      activeUserMeta,
      300,
    );
  });

  it('rejects with UnauthorizedException when authVersion in token is outdated (session revoked)', async () => {
    // User authVersion was bumped to 2 (e.g. password changed), but token has version 1
    mockRedisService.cache.set('user:auth-meta:user-uuid-1', {
      ...activeUserMeta,
      authVersion: 2,
    });
    const context = createMockContext('Bearer old-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token is no longer valid'),
    );
  });

  it('rejects with UnauthorizedException when user account is locked', async () => {
    mockRedisService.cache.set('user:auth-meta:user-uuid-1', {
      ...activeUserMeta,
      status: UserStatus.LOCKED,
    });
    const context = createMockContext('Bearer valid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token is no longer valid'),
    );
  });

  it('rejects with UnauthorizedException when user organization does not match token payload', async () => {
    mockRedisService.cache.set('user:auth-meta:user-uuid-1', {
      ...activeUserMeta,
      organizationId: 'different-org-uuid',
    });
    const context = createMockContext('Bearer valid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token is no longer valid'),
    );
  });

  it('gracefully degrades to PostgreSQL lookup if Redis throws an error without returning 500', async () => {
    mockRedisService.get.mockRejectedValue(new Error('Redis connection timeout'));
    mockRedisService.set.mockRejectedValue(new Error('Redis connection timeout'));
    const context = createMockContext('Bearer valid-token');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockUserRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      select: {
        id: true,
        organizationId: true,
        status: true,
        authVersion: true,
      },
    });
  });

  it('authenticates properly when redisService is not provided (@Optional fallback)', async () => {
    const fallbackGuard = new JwtAuthGuard(
      reflector,
      jwtService,
      configService,
      dataSource as DataSource,
      undefined, // No Redis
    );
    const context = createMockContext('Bearer valid-token');

    const allowed = await fallbackGuard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockUserRepo.findOne).toHaveBeenCalled();
  });
});
