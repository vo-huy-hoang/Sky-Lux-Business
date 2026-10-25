import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('AuthService', () => {
  let service: AuthService;
  let testingModule: TestingModule;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
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
      ],
    }).compile();

    service = testingModule.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
