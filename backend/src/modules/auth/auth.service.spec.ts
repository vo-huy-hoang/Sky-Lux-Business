import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { derivePurposeSecret } from '../../common/utils/jwt-purpose.util';
import { UserStatus } from '../../common/enums';
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
    }), expect.objectContaining({ secret: derivePurposeSecret('test-jwt-secret', 'access') }));
    expect(jwtService.signAsync).toHaveBeenCalledWith(expect.objectContaining({
      id: 'admin-id',
      familyId: expect.any(String),
    }), expect.objectContaining({ secret: derivePurposeSecret('test-jwt-secret', 'refresh') }));
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
      { secret: derivePurposeSecret('test-jwt-secret', 'stream'), expiresIn: '60s' },
    );
  });

  describe('Refresh Token Family Rotation & Reuse Detection (Ticket 04)', () => {
    it('rotates an active refresh token keeping familyId and marking the old token ROTATED', async () => {
      const jwtService = testingModule.get<JwtService>(JwtService);
      const configService = testingModule.get<ConfigService>(ConfigService);
      jest.spyOn(configService, 'get').mockReturnValue('test-jwt-secret');
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ id: 'user-1', familyId: 'fam-111' } as any);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('new-access-jwt')
        .mockResolvedValueOnce('new-refresh-jwt');

      const oldRecord = {
        id: 'rt-old',
        userId: 'user-1',
        familyId: 'fam-111',
        status: 'ACTIVE',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(oldRecord);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        status: UserStatus.ACTIVE,
        authVersion: 0,
        roles: [{ id: 'role-1', code: 'SALES' }],
      });
      mockRefreshTokenRepository.create.mockImplementation((v: any) => ({
        id: 'rt-new',
        ...v,
      }));
      mockRefreshTokenRepository.save.mockImplementation(async (v: any) => ({
        id: v.id || 'rt-new',
        ...v,
      }));

      const res = await service.refreshToken({ refreshToken: 'raw-refresh-1' });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('raw-refresh-1', {
        secret: derivePurposeSecret('test-jwt-secret', 'refresh'),
      });
      expect(res.accessToken).toBe('new-access-jwt');
      expect(res.refreshToken).toBe('new-refresh-jwt');
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          familyId: 'fam-111',
          status: 'ACTIVE',
        }),
      );
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rt-old',
          isRevoked: true,
          status: 'ROTATED',
          replacedByTokenId: 'rt-new',
        }),
      );
    });

    it('immediately revokes all tokens in the same familyId when a rotated token is replayed', async () => {
      const jwtService = testingModule.get<JwtService>(JwtService);
      const configService = testingModule.get<ConfigService>(ConfigService);
      jest.spyOn(configService, 'get').mockReturnValue('test-jwt-secret');
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ id: 'user-1', familyId: 'fam-compromised' } as any);

      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-rotated',
        userId: 'user-1',
        familyId: 'fam-compromised',
        status: 'ROTATED',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 3 });

      await expect(
        service.refreshToken({ refreshToken: 'replayed-refresh-token' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { familyId: 'fam-compromised', isRevoked: false },
        expect.objectContaining({
          isRevoked: true,
          status: 'REVOKED',
          revokedReason: 'TOKEN_REUSE_DETECTED',
        }),
      );
    });

    it('rejects concurrent racing refresh without minting duplicate tokens when atomic claim loses', async () => {
      const jwtService = testingModule.get<JwtService>(JwtService);
      const configService = testingModule.get<ConfigService>(ConfigService);
      jest.spyOn(configService, 'get').mockReturnValue('test-jwt-secret');
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ id: 'user-1', familyId: 'fam-race' } as any);
      const signSpy = jest.spyOn(jwtService, 'signAsync');

      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-race',
        userId: 'user-1',
        familyId: 'fam-race',
        status: 'ACTIVE',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        status: UserStatus.ACTIVE,
        authVersion: 0,
        roles: [{ id: 'role-1', code: 'SALES' }],
      });
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.refreshToken({ refreshToken: 'raw-refresh-race' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(signSpy).not.toHaveBeenCalled();
    });

    it('logout revokes only the current familyId session when refreshToken cookie is omitted on /auth/logout', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await service.logout('user-1', undefined, 'fam-session-1');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', familyId: 'fam-session-1', isRevoked: false },
        expect.objectContaining({
          isRevoked: true,
          status: 'REVOKED',
          revokedReason: 'LOGOUT',
        }),
      );
    });
  });

  describe('Security Cache Invalidation (0ms Realtime Revocation)', () => {
    it('changePassword increments authVersion, revokes tokens, and immediately invalidates Redis auth-meta cache', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        passwordHash: 'old-hashed-password',
        authVersion: 1,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation((u: any) => Promise.resolve(u));
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
        expect.objectContaining({ isRevoked: true, status: 'REVOKED' }),
      );
      // Redis auth-meta cache is actively deleted for 0ms realtime revocation
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-1');
    });

    it('revokeUserTokens invalidates Redis auth-meta cache', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeUserTokens('user-uuid-2');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-2', isRevoked: false },
        expect.objectContaining({ isRevoked: true, status: 'REVOKED' }),
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-uuid-2');
    });
  });

  describe('Unused 2FA Hardening & Forced Password Rotation (Ticket 05)', () => {
    it('rejects enabling twoFactorEnabled via updateMySettings until real TOTP is implemented', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        twoFactorEnabled: false,
        notificationPreferences: {},
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.updateMySettings('user-uuid-1', { twoFactorEnabled: true }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUser.twoFactorEnabled).toBe(false);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('still updates notificationPreferences via updateMySettings without enabling 2FA', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        twoFactorEnabled: false,
        notificationPreferences: { taskAssignments: false },
        roles: [],
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation((u: any) => Promise.resolve(u));

      const updated = await service.updateMySettings('user-uuid-1', {
        taskAssignments: true,
      });

      expect(mockUser.twoFactorEnabled).toBe(false);
      expect(updated.notificationPreferences.taskAssignments).toBe(true);
      expect(updated.twoFactorEnabled).toBe(false);
    });

    it('exposes mustChangePassword in login and getMe responses and clears it on changePassword', async () => {
      const firstLoginUser = {
        id: 'new-staff-1',
        organizationId: 'org-1',
        departmentId: null,
        employeeCode: 'EMP100',
        fullName: 'New Staff',
        email: 'staff@skylux.vn',
        passwordHash: 'temp-hash',
        status: UserStatus.ACTIVE,
        authVersion: 0,
        mustChangePassword: true,
        twoFactorEnabled: false,
        notificationPreferences: {},
        roles: [{ id: 'r1', code: 'SALES', name: 'Sales' }],
      };
      mockUserRepository.findOne.mockResolvedValue(firstLoginUser);
      mockUserRepository.save.mockImplementation((u: any) => Promise.resolve(u));
      mockRefreshTokenRepository.create.mockImplementation((v: any) => v);
      mockRefreshTokenRepository.save.mockResolvedValue(undefined);
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      const configService = testingModule.get<ConfigService>(ConfigService);
      const jwtService = testingModule.get<JwtService>(JwtService);
      jest.spyOn(configService, 'get').mockReturnValue('test-jwt-secret');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('signed-jwt');

      const loginResult = await service.login({
        email: 'staff@skylux.vn',
        password: 'TempPassword123',
      });
      expect((loginResult.user as any).mustChangePassword).toBe(true);

      const meResult = await service.getMe('new-staff-1');
      expect((meResult as any).mustChangePassword).toBe(true);

      await expect(
        service.changePassword('new-staff-1', {
          currentPassword: 'SamePassword123',
          newPassword: 'SamePassword123',
        }),
      ).rejects.toThrow(BadRequestException);

      await service.changePassword('new-staff-1', {
        currentPassword: 'TempPassword123',
        newPassword: 'RotatedPassword123',
      });

      expect(firstLoginUser.mustChangePassword).toBe(false);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-staff-1',
          mustChangePassword: false,
        }),
      );
    });
  });
});

