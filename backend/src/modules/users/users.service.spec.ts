import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../roles/entities/role.entity';
import { Department } from '../departments/entities/department.entity';
import { UserStatus } from '../../common/enums';
import { QueryUserDto } from './dto/query-user.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockRefreshTokenRepository = {
    update: jest.fn(),
  };

  const mockRoleRepository = {
    find: jest.fn(),
  };

  const mockDepartmentRepository = {
    findOne: jest.fn(),
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
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentRepository,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll (API-USERS-001)', () => {
    it('should return paginated list of users without passwordHash', async () => {
      const orgId = 'org-uuid';
      const mockUsers = [
        {
          id: 'u-1',
          fullName: 'User One',
          email: 'u1@example.com',
          passwordHash: 'secret-hash',
          organizationId: orgId,
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 1]);

      const queryDto: QueryUserDto = {
        page: 1,
        limit: 20,
        pageSize: 20,
        search: 'User',
        status: UserStatus.ACTIVE,
        departmentId: 'dept-uuid',
        roleId: 'role-uuid',
      };

      const result = await service.findAll(orgId, queryDto);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith(
        'user',
      );
      expect(result.data).toHaveLength(1);
      expect((result.data[0] as any).passwordHash).toBeUndefined();
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findOne (API-USERS-002)', () => {
    it('should return user detail without passwordHash', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const mockUser = {
        id: userId,
        organizationId: orgId,
        fullName: 'User Name',
        passwordHash: 'secret-hash',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(orgId, userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organizationId: orgId },
        relations: { department: true, roles: true },
      });
      expect(result.data.id).toBe(userId);
      expect((result.data as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('org-uuid', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create (API-USERS-003)', () => {
    it('should create new user successfully with hashed password', async () => {
      const orgId = 'org-uuid';
      const dto = {
        fullName: 'New User',
        email: 'new@skylux.vn',
        employeeCode: 'EMP001',
        password: 'Password@123',
        departmentId: 'dept-uuid',
        roleIds: ['role-uuid'],
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // employeeCode check
      mockDepartmentRepository.findOne.mockResolvedValue({
        id: 'dept-uuid',
        organizationId: orgId,
      });
      mockRoleRepository.find.mockResolvedValue([
        { id: 'role-uuid', organizationId: orgId },
      ]);

      const createdEntity = {
        ...dto,
        id: 'new-user-id',
        organizationId: orgId,
        passwordHash: 'hashed-pwd',
      };
      mockUserRepository.create.mockReturnValue(createdEntity);
      mockUserRepository.save.mockResolvedValue(createdEntity);

      const result = await service.create(orgId, dto);

      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect((result.data as any).passwordHash).toBeUndefined();
      expect(result.data.id).toBe('new-user-id');
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({ id: 'existing-id' });

      await expect(
        service.create('org-uuid', {
          fullName: 'Test',
          email: 'exist@skylux.vn',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if employeeCode exists in organization', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // email ok
        .mockResolvedValueOnce({ id: 'existing-id' }); // code conflict

      await expect(
        service.create('org-uuid', {
          fullName: 'Test',
          email: 'new@skylux.vn',
          employeeCode: 'EMP001',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockUserRepository.findOne).toHaveBeenLastCalledWith({
        where: { employeeCode: 'EMP001', organizationId: 'org-uuid' },
      });
    });

    it('should allow same employeeCode in different organizations', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // email ok
        .mockResolvedValueOnce(null); // code check in org-2 -> ok

      const createdUserOrg2 = {
        id: 'user-org2',
        fullName: 'Org2 User',
        email: 'org2@skylux.vn',
        employeeCode: 'EMP001',
        organizationId: 'org-2',
        passwordHash: 'hashed',
      };
      mockUserRepository.create.mockReturnValue(createdUserOrg2);
      mockUserRepository.save.mockResolvedValue(createdUserOrg2);

      const result = await service.create('org-2', {
        fullName: 'Org2 User',
        email: 'org2@skylux.vn',
        employeeCode: 'EMP001',
      });

      expect(mockUserRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { employeeCode: 'EMP001', organizationId: 'org-2' },
      });
      expect(result.data.employeeCode).toBe('EMP001');
    });

    it('should throw BadRequestException if department does not belong to organization', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockDepartmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('org-uuid', {
          fullName: 'Test',
          email: 'new@skylux.vn',
          departmentId: 'invalid-dept',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if roles do not belong to organization', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.find.mockResolvedValue([]); // found 0 instead of 1

      await expect(
        service.create('org-uuid', {
          fullName: 'Test',
          email: 'new@skylux.vn',
          roleIds: ['invalid-role'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update (API-USERS-004)', () => {
    it('should update user successfully', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const existingUser = {
        id: userId,
        organizationId: orgId,
        fullName: 'Old Name',
        email: 'old@skylux.vn',
        employeeCode: 'EMP001',
        passwordHash: 'old-hash',
      };

      mockUserRepository.findOne.mockResolvedValueOnce(existingUser);
      mockDepartmentRepository.findOne.mockResolvedValue({
        id: 'dept-2',
        organizationId: orgId,
      });
      mockRoleRepository.find.mockResolvedValue([
        { id: 'role-2', organizationId: orgId },
      ]);
      mockUserRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.update(orgId, userId, {
        fullName: 'New Name',
        departmentId: 'dept-2',
        roleIds: ['role-2'],
      });

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.data.fullName).toBe('New Name');
      expect((result.data as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user not found for update', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('org-uuid', 'invalid-id', { fullName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated employeeCode exists in the same organization', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const existingUser = {
        id: userId,
        organizationId: orgId,
        fullName: 'User Name',
        email: 'user@skylux.vn',
        employeeCode: 'EMP001',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(existingUser) // find user
        .mockResolvedValueOnce({ id: 'another-user-id' }); // employeeCode check conflict

      await expect(
        service.update(orgId, userId, {
          employeeCode: 'EMP002',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockUserRepository.findOne).toHaveBeenLastCalledWith({
        where: { employeeCode: 'EMP002', organizationId: orgId },
      });
    });
  });

  describe('lockUser (API-USERS-005)', () => {
    it('should lock user status and revoke all sessions', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const mockUser = {
        id: userId,
        organizationId: orgId,
        status: UserStatus.ACTIVE,
        passwordHash: 'secret',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        status: UserStatus.LOCKED,
      });
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.lockUser(orgId, userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organizationId: orgId },
        relations: { department: true, roles: true },
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
      expect(result.message).toContain('Đã khóa tài khoản');
      expect((result.data as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(
        service.lockUser('org-uuid', 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlockUser (API-USERS-006)', () => {
    it('should unlock user status to ACTIVE', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const mockUser = {
        id: userId,
        organizationId: orgId,
        status: UserStatus.LOCKED,
        passwordHash: 'secret',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      const result = await service.unlockUser(orgId, userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId, organizationId: orgId },
        relations: { department: true, roles: true },
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.message).toContain('Đã mở khóa tài khoản');
      expect((result.data as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(
        service.unlockUser('org-uuid', 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (API-USERS-007)', () => {
    it('should revoke tokens and softRemove user', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const mockUser = { id: userId, organizationId: orgId };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.softRemove.mockResolvedValue(mockUser);

      const result = await service.remove(orgId, userId);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
      expect(mockUserRepository.softRemove).toHaveBeenCalledWith(mockUser);
      expect(result.data.deleted).toBe(true);
    });

    it('should throw NotFoundException if user not found for deletion', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('org-uuid', 'invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignRoles (API-RBAC-006)', () => {
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
        relations: { department: true, roles: true },
      });
      expect(mockRoleRepository.find).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Gán vai trò cho nhân viên thành công',
      });
    });
  });
});
