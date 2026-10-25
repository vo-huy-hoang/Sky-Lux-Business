import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../../common/redis/redis.service';

describe('RolesService', () => {
  let service: RolesService;
  let repository: jest.Mocked<Repository<Role>>;
  let mockRedisService: any;

  // Shared constants for tests
  const orgId = 'org-uuid';
  const roleId = 'role-uuid';
  const systemRole = {
    id: roleId,
    code: 'ADMIN',
    name: 'Admin',
    isSystem: true,
  } as Role;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockEntityManager = {
    delete: jest.fn(),
    create: jest.fn((entity: any, data: any) => data),
    save: jest.fn(),
    query: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (em: any) => Promise<any>) =>
      cb(mockEntityManager as any),
    ),
    query: jest.fn().mockResolvedValue([{ user_id: 'user-1' }, { user_id: 'user-2' }]),
  };

  beforeEach(async () => {
    mockRedisService = {
      del: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repository = module.get<Repository<Role>>(
      getRepositoryToken(Role),
    ) as jest.Mocked<Repository<Role>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      code: 'TEST_ROLE',
      name: 'Test Role',
      description: 'Test desc',
    };

    it('should create and save a new role', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        ...dto,
        organizationId: orgId,
        isSystem: false,
      } as Role);
      repository.save.mockResolvedValue({
        id: roleId,
        ...dto,
        organizationId: orgId,
        isSystem: false,
      } as Role);

      const result = await service.create(dto, orgId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId, code: dto.code },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', roleId);
    });

    it('should throw ConflictException if role code already exists in organization', async () => {
      repository.findOne.mockResolvedValue({
        id: 'existing-uuid',
        ...dto,
      } as Role);

      await expect(service.create(dto, orgId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all roles for organization', async () => {
      const mockRoles = [
        { id: '1', code: 'A' },
        { id: '2', code: 'B' },
      ] as Role[];
      repository.find.mockResolvedValue(mockRoles);

      const result = await service.findAll(orgId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { isSystem: 'DESC', code: 'ASC' },
      });
      expect(result).toEqual(mockRoles);
    });
  });

  describe('findOne', () => {
    it('should return role if found', async () => {
      const mockRole = { id: roleId, code: 'ROLE' } as Role;
      repository.findOne.mockResolvedValue(mockRole);

      const result = await service.findOne(roleId, orgId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: roleId, organizationId: orgId },
        relations: {
          rolePermissions: {
            permission: true,
          },
        },
      });
      expect(result).toEqual(mockRole);
    });

    it('should throw NotFoundException if role not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('invalid-id', orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const existingRole = {
      id: roleId,
      code: 'OLD',
      name: 'Old Name',
      isSystem: false,
    } as Role;
    const updateDto = { name: 'New Name' };

    it('should update role fields successfully', async () => {
      repository.findOne.mockResolvedValueOnce(existingRole);
      repository.save.mockResolvedValue({
        ...existingRole,
        ...updateDto,
      });

      const result = await service.update(roleId, updateDto, orgId);

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should throw BadRequestException when trying to update a system role', async () => {
      repository.findOne.mockResolvedValue(systemRole);

      await expect(
        service.update(roleId, { name: 'New Name' }, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const customRole = {
      id: roleId,
      code: 'CUSTOM',
      isSystem: false,
      users: [] as any[],
    } as Role;

    it('should soft delete role when no active users are assigned', async () => {
      repository.findOne.mockResolvedValue(customRole);
      repository.softRemove.mockResolvedValue(customRole);

      const result = await service.remove(roleId, orgId);

      expect(repository.softRemove).toHaveBeenCalledWith(customRole);
      expect(result).toEqual({ message: 'Đã xóa vai trò thành công' });
    });

    it('should throw BadRequestException when trying to delete system role', async () => {
      repository.findOne.mockResolvedValue(systemRole);

      await expect(service.remove(roleId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ROLE_HAS_ASSIGNED_USERS warning when users are assigned and force is false', async () => {
      const roleWithUsers = {
        ...customRole,
        users: [{ id: 'user1' }],
      } as Role;

      repository.findOne.mockResolvedValue(roleWithUsers);

      await expect(service.remove(roleId, orgId)).rejects.toThrow(
        new BadRequestException({
          code: 'ROLE_HAS_ASSIGNED_USERS',
          message: 'Vai trò này hiện đang được gán cho 1 nhân viên.',
          details: { count: 1 },
        }),
      );
    });

    it('should clear users mapping and soft delete when force is true', async () => {
      const roleWithUsers = {
        ...customRole,
        users: [{ id: 'user1' }],
      } as Role;

      repository.findOne.mockResolvedValue(roleWithUsers);
      repository.save.mockResolvedValue({
        ...roleWithUsers,
        users: [],
      });
      repository.softRemove.mockResolvedValue({
        ...roleWithUsers,
        users: [],
      });

      const result = await service.remove(roleId, orgId, true);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ users: [] }),
      );
      expect(repository.softRemove).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Đã xóa vai trò thành công' });
    });
  });

  describe('assignPermissions', () => {
    const customRole = { id: roleId, code: 'CUSTOM', isSystem: false } as Role;

    it('should assign role permissions inside a database transaction', async () => {
      const dto = {
        permissions: [
          { permissionId: 'p1-uuid', scope: 'ALL' as any },
          { permissionId: 'p2-uuid', scope: 'OWN' as any },
        ],
      };

      repository.findOne.mockResolvedValue(customRole);
      mockEntityManager.delete.mockResolvedValue({ affected: 2 });
      mockEntityManager.save.mockResolvedValue([]);

      const result = await service.assignPermissions(roleId, dto, orgId);

      expect(repository.findOne).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.delete).toHaveBeenCalledWith(expect.anything(), {
        roleId: customRole.id,
      });
      expect(mockEntityManager.create).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT "user_id" FROM "user_roles"'),
        [customRole.id],
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-1');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:auth-meta:user-2');
      expect(result).toEqual({ message: 'Gán quyền cho vai trò thành công' });
    });

    it('should not throw if Redis del fails when assigning permissions', async () => {
      const dto = {
        permissions: [{ permissionId: 'p1-uuid', scope: 'ALL' as any }],
      };

      repository.findOne.mockResolvedValue(customRole);
      mockEntityManager.delete.mockResolvedValue({ affected: 1 });
      mockEntityManager.save.mockResolvedValue([]);
      mockRedisService.del.mockRejectedValue(new Error('Redis connection lost'));

      const result = await service.assignPermissions(roleId, dto, orgId);

      expect(result).toEqual({ message: 'Gán quyền cho vai trò thành công' });
    });

    it('should throw BadRequestException if role is system role', async () => {
      const dto = { permissions: [] };

      repository.findOne.mockResolvedValue(systemRole);

      await expect(
        service.assignPermissions(roleId, dto, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
