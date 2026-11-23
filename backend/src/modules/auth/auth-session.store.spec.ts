import { DataSource } from 'typeorm';
import { AuthSessionStore, UserAuthMeta } from './auth-session.store';
import { UserStatus } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthSessionStore (Deep Seam: Redis Cache, DB Fallback & Invalidation)', () => {
  let store: AuthSessionStore;
  let dataSource: any;
  let mockUserRepo: any;
  let mockRefreshTokenRepo: any;
  let mockRedisService: any;

  const mockUserEntity = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    status: UserStatus.ACTIVE,
    authVersion: 3,
    mustChangePassword: false,
  };

  beforeEach(() => {
    mockUserRepo = {
      findOne: jest.fn().mockResolvedValue(mockUserEntity),
    };

    mockRefreshTokenRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      getRepository: jest.fn((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === RefreshToken) return mockRefreshTokenRepo;
        return mockUserRepo;
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    mockRedisService = {
      cache: new Map<string, any>(),
      get: jest.fn(async (key: string) => mockRedisService.cache.get(key) ?? null),
      set: jest.fn(async (key: string, val: any) => {
        mockRedisService.cache.set(key, val);
      }),
      del: jest.fn(async (key: string) => {
        mockRedisService.cache.delete(key);
      }),
    };

    store = new AuthSessionStore(dataSource, mockRedisService);
  });

  describe('getAuthMeta', () => {
    it('returns cached auth-meta immediately on cache hit without querying DB', async () => {
      const cachedMeta: UserAuthMeta = {
        id: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        status: UserStatus.ACTIVE,
        authVersion: 3,
        mustChangePassword: false,
      };
      await mockRedisService.set('user:auth-meta:user-uuid-1', cachedMeta);

      const result = await store.getAuthMeta('user-uuid-1');

      expect(result).toEqual(cachedMeta);
      expect(mockRedisService.get).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
      expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    });

    it('queries database and populates Redis cache (TTL 300s) on cache miss', async () => {
      const result = await store.getAuthMeta('user-uuid-1');

      expect(mockRedisService.get).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        select: {
          id: true,
          organizationId: true,
          status: true,
          authVersion: true,
          mustChangePassword: true,
        },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'user:auth-meta:user-uuid-1',
        {
          id: 'user-uuid-1',
          organizationId: 'org-uuid-1',
          status: UserStatus.ACTIVE,
          authVersion: 3,
          mustChangePassword: false,
        },
        300,
      );
      expect(result).toEqual({
        id: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        status: UserStatus.ACTIVE,
        authVersion: 3,
        mustChangePassword: false,
      });
    });

    it('gracefully falls back to DB when Redis throws an exception (resilience)', async () => {
      mockRedisService.get.mockRejectedValueOnce(new Error('Redis connection timed out'));
      mockRedisService.set.mockRejectedValueOnce(new Error('Redis write failure'));

      const result = await store.getAuthMeta('user-uuid-1');

      expect(result).toEqual({
        id: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        status: UserStatus.ACTIVE,
        authVersion: 3,
        mustChangePassword: false,
      });
      expect(mockUserRepo.findOne).toHaveBeenCalled();
    });

    it('works seamlessly when RedisService is undefined (no Redis environment)', async () => {
      const storeWithoutRedis = new AuthSessionStore(dataSource, undefined);

      const result = await storeWithoutRedis.getAuthMeta('user-uuid-1');

      expect(result).toEqual({
        id: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        status: UserStatus.ACTIVE,
        authVersion: 3,
        mustChangePassword: false,
      });
      expect(mockUserRepo.findOne).toHaveBeenCalled();
    });

    it('returns null when user is not found in database', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      const result = await store.getAuthMeta('non-existent-user');

      expect(result).toBeNull();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('deletes Redis cache key for a single user', async () => {
      await store.invalidateCache('user-uuid-1');

      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    });

    it('deletes Redis cache keys for multiple users in parallel', async () => {
      await store.invalidateCache(['user-uuid-1', 'user-uuid-2', 'user-uuid-3']);

      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-2');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-3');
    });

    it('does not throw when Redis delete fails', async () => {
      mockRedisService.del.mockRejectedValueOnce(new Error('Redis del failed'));

      await expect(store.invalidateCache('user-uuid-1')).resolves.not.toThrow();
    });
  });

  describe('bumpAuthVersionAndInvalidate', () => {
    it('executes UPDATE on users table and invalidates cache in Redis', async () => {
      await store.bumpAuthVersionAndInvalidate(['user-1', 'user-2']);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "users" SET "auth_version" = "auth_version" + 1'),
        [['user-1', 'user-2']],
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-1');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-2');
    });

    it('uses provided transaction manager when supplied', async () => {
      const mockManager = {
        query: jest.fn().mockResolvedValue([]),
      } as any;

      await store.bumpAuthVersionAndInvalidate('user-1', mockManager);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "users" SET "auth_version" = "auth_version" + 1'),
        [['user-1']],
      );
      expect(dataSource.query).not.toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-1');
    });
  });

  describe('bumpAuthVersionForRole', () => {
    it('updates users having role and invalidates their Redis caches', async () => {
      dataSource.query.mockImplementation((queryStr: string) => {
        if (queryStr.includes('SELECT "user_id"')) {
          return Promise.resolve([{ user_id: 'user-role-1' }, { user_id: 'user-role-2' }]);
        }
        return Promise.resolve([]);
      });

      await store.bumpAuthVersionForRole('role-123');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "users" SET "auth_version" = "auth_version" + 1'),
        ['role-123'],
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT "user_id" FROM "user_roles"'),
        ['role-123'],
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-role-1');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-role-2');
    });
  });

  describe('revokeSessions', () => {
    it('revokes refresh tokens, bumps authVersion and invalidates cache', async () => {
      await store.revokeSessions('user-uuid-1');

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', isRevoked: false },
        { isRevoked: true, status: 'REVOKED', revokedReason: 'REVOKED' },
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "users" SET "auth_version" = "auth_version" + 1'),
        [['user-uuid-1']],
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    });
  });
});
