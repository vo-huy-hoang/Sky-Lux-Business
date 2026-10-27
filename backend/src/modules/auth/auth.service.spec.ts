import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RedisService } from '../../common/redis/redis.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let testingModule: TestingModule;
  let mockUserRepository: any;
  let mockRefreshTokenRepository: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockRedisService = {
      del: jest.fn().mockResolvedValue(undefined),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = testingModule.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('authenticates a SUPER_ADMIN with wildcard permissions without requiring role_permissions rows', async () => {
    const user = {
      id: 'admin-id', organizationId: 'org-id', departmentId: null,
      employeeCode: 'SLX-ADMIN-001', fullName: 'Admin', email: 'admin@example.com',
      passwordHash: 'bcrypt-hash', status: 'ACTIVE', authVersion: 0,
      organization: { name: 'Sky-Lux Travel Corporation' }, department: null,
      roles: [{ id: 'role-id', code: 'SUPER_ADMIN' }],
    };
    mockUserRepository.findOne.mockResolvedValue(user);
    mockUserRepository.save.mockImplementation(async (value: any) => value);
    mockRefreshTokenRepository.create.mockImplementation((value: any) => value);
    mockRefreshTokenRepository.save.mockResolvedValue(undefined);
    const jwtService = testingModule.get<JwtService>(JwtService);
    const configService = testingModule.get<ConfigService>(ConfigService);
    jest.spyOn(configService, 'get').mockReturnValue('test-jwt-secret');
    jest.spyOn(jwtService, 'signAsync').mockResolvedValue('signed-token');

    const result = await service.login({ email: ' ADMIN@EXAMPLE.COM ', password: 'password' });

    expect(result.user).toMatchObject({ roles: ['SUPER_ADMIN'], permissions: ['*'] });
    expect(jwtService.signAsync).toHaveBeenCalledWith(expect.objectContaining({
      roles: ['SUPER_ADMIN'], permissions: ['*'], email: 'admin@example.com',
    }), expect.objectContaining({ secret: 'test-jwt-secret' }));
    const rolePermissionRepository = testingModule.get<any>(getRepositoryToken(RolePermission));
    expect(rolePermissionRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('createStreamToken signs a fresh short-lived token without inherited JWT claims', async () => {
    const jwtService = testingModule.get<JwtService>(JwtService);
    const configService = testingModule.get<ConfigService>(ConfigService);
    jest.spyOn(configService, 'get').mockReturnValue('test-jwt-secret');
    jest.spyOn(jwtService, 'signAsync').mockResolvedValue('stream-token');

    const user: CurrentUserPayload = {
      id: 'user-1',
      organizationId: 'organization-1',
      departmentId: 'department-1',
      employeeCode: 'EMP001',
      fullName: 'Test User',
      email: 'test@example.com',
      roles: ['SALES'],
      permissions: ['chat.access'],
    };

    const authenticatedUser = {
      ...user,
      exp: 1_800_000_000,
      iat: 1_799_999_940,
    };

    await expect(
      service.createStreamToken(authenticatedUser as CurrentUserPayload),
    ).resolves.toEqual({
      token: 'stream-token',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { ...user, stream: true },
      { secret: 'test-jwt-secret', expiresIn: '60s' },
    );
  });

  describe('Security Cache Invalidation (0ms Realtime Revocation)', () => {
    it('changePassword increments authVersion, revokes tokens, and immediately invalidates Redis auth-meta cache', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        passwordHash: 'old-hashed-password',
        authVersion: 1,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation(async (u: any) => u);
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 2 });

      const result = await service.changePassword('user-uuid-1', {
        currentPassword: 'currentPassword123',
        newPassword: 'newPassword123',
      });

      expect(result).toEqual({ message: 'Đổi mật khẩu thành công' });
      expect(mockUser.authVersion).toBe(2);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-uuid-1',
          authVersion: 2,
          passwordHash: 'new-hashed-password',
        }),
      );
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', isRevoked: false },
        { isRevoked: true },
      );
      // Redis auth-meta cache is actively deleted for 0ms realtime revocation
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    });

    it('revokeUserTokens invalidates Redis auth-meta cache', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeUserTokens('user-uuid-2');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-2', isRevoked: false },
        { isRevoked: true },
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-2');
    });
  });
});

