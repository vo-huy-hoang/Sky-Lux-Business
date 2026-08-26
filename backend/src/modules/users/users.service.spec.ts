import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../roles/entities/role.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: any;
  let roleRepo: any;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    update: jest.fn(),
  };

  const mockRoleRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('lockUser', () => {
    it('should lock user status and revoke all sessions', async () => {
      const mockUser = { id: 'user-uuid', status: 'ACTIVE', save: jest.fn() };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.lockUser('user-uuid');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid', isRevoked: false },
        { isRevoked: true },
      );
      expect(result.message).toContain('Đã khóa tài khoản');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.lockUser('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignRoles', () => {
    it('should assign valid roles to user successfully', async () => {
      const userId = 'user-uuid';
      const orgId = 'org-uuid';
      const mockUser = { id: userId, organizationId: orgId, roles: [] };
      const mockRoles = [
        { id: 'role1', organizationId: orgId, code: 'SALES' },
        { id: 'role2', organizationId: orgId, code: 'OPERATOR' },
      ];
      const dto = { roleIds: ['role1', 'role2'] };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.find.mockResolvedValue(mockRoles);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        roles: mockRoles,
      });

      const result = await service.assignRoles(userId, dto, orgId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organizationId: orgId },
        relations: { roles: true },
      });
      expect(mockRoleRepository.find).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Gán vai trò cho nhân viên thành công',
      });
    });

    it('should throw NotFoundException if user does not exist in organization', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const dto = { roleIds: ['role1'] };

      await expect(
        service.assignRoles('user-uuid', dto, 'org-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if any role is invalid or belongs to other organization', async () => {
      const userId = 'user-uuid';
      const orgId = 'org-uuid';
      const mockUser = { id: userId, organizationId: orgId, roles: [] };
      // Only 1 role found instead of 2 requested
      const mockRoles = [{ id: 'role1', organizationId: orgId, code: 'SALES' }];
      const dto = { roleIds: ['role1', 'role-other-org'] };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.find.mockResolvedValue(mockRoles);

      await expect(service.assignRoles(userId, dto, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
