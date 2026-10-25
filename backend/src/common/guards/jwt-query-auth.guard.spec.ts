import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { JwtQueryAuthGuard } from './jwt-query-auth.guard';
import { UserStatus } from '../enums';
import { UserAuthMeta } from './jwt-auth.guard';

describe('JwtQueryAuthGuard (with Redis Cache & DB Fallback)', () => {
  let guard: JwtQueryAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: any;
  let mockUserRepo: any;
  let mockRedisService: any;

  const validStreamPayload = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    stream: true,
    authVersion: 1,
  };

  const activeUserMeta: UserAuthMeta = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    status: UserStatus.ACTIVE,
    authVersion: 1,
  };

  function createMockContext(queryToken?: string): ExecutionContext {
    const request = {
      query: {
        token: queryToken,
      },
      user: undefined,
    };
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue(validStreamPayload),
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

    guard = new JwtQueryAuthGuard(
      jwtService,
      configService,
      dataSource as DataSource,
      mockRedisService,
    );
  });

  it('throws UnauthorizedException when token query parameter is missing', async () => {
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing token query parameter'),
    );
  });

  it('throws UnauthorizedException when payload does not have stream === true', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({
      ...validStreamPayload,
      stream: false,
    });
    const context = createMockContext('invalid-stream-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Stream token không hợp lệ'),
    );
  });

  it('authenticates directly from Redis without database query on cache hit', async () => {
    mockRedisService.cache.set('user:auth-meta:user-uuid-1', activeUserMeta);
    const context = createMockContext('valid-token');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockRedisService.get).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual(validStreamPayload);
  });

  it('loads user from database and caches into Redis on cache miss', async () => {
    const context = createMockContext('valid-token');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockRedisService.get).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    expect(mockUserRepo.findOne).toHaveBeenCalled();
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'user:auth-meta:user-uuid-1',
      activeUserMeta,
      300,
    );
  });

  it('rejects with UnauthorizedException when token authVersion is stale', async () => {
    mockRedisService.cache.set('user:auth-meta:user-uuid-1', {
      ...activeUserMeta,
      authVersion: 2, // Database/cache is ahead of token
    });
    const context = createMockContext('stale-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Stream token không còn hợp lệ'),
    );
  });

  it('gracefully degrades to database query when Redis throws an error', async () => {
    mockRedisService.get.mockRejectedValue(new Error('Redis down'));
    const context = createMockContext('valid-token');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(mockUserRepo.findOne).toHaveBeenCalled();
  });
});
