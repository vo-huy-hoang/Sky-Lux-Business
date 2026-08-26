import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';

describe('RolesService', () => {
  let service: RolesService;
  let repository: any;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockEntityManager = {
    delete: jest.fn(),
    create: jest.fn((entity, data) => data),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repository = module.get(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new role', async () => {
      const dto = {
        code: 'TEST_ROLE',
        name: 'Test Role',
        description: 'Test desc',
      };
      const orgId = 'org-uuid';
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        ...dto,
        organizationId: orgId,
        isSystem: false,
      });
      repository.save.mockResolvedValue({
        id: 'role-uuid',
        ...dto,
        organizationId: orgId,
        isSystem: false,
      });

      const result = await service.create(dto, orgId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId, code: dto.code },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'role-uuid');
    });

    it('should throw ConflictException if role code already exists in organization', async () => {
      const dto = { code: 'TEST_ROLE', name: 'Test Role' };
      const orgId = 'org-uuid';
      repository.findOne.mockResolvedValue({ id: 'existing-uuid', ...dto });

      await expect(service.create(dto, orgId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all roles for organization', async () => {
      const orgId = 'org-uuid';
      const mockRoles = [
        { id: '1', code: 'A' },
        { id: '2', code: 'B' },
      ];
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
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const mockRole = { id, code: 'ROLE' };
      repository.findOne.mockResolvedValue(mockRole);

      const result = await service.findOne(id, orgId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id, organizationId: orgId },
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
      await expect(service.findOne('invalid-id', 'org-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update role fields successfully', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const existingRole = {
        id,
        code: 'OLD',
        name: 'Old Name',
        isSystem: false,
      };
      const updateDto = { name: 'New Name' };

      repository.findOne.mockResolvedValueOnce(existingRole); // For findOne
      repository.save.mockResolvedValue({ ...existingRole, ...updateDto });

      const result = await service.update(id, updateDto, orgId);

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should throw BadRequestException when trying to update a system role', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const systemRole = { id, code: 'ADMIN', name: 'Admin', isSystem: true };

      repository.findOne.mockResolvedValue(systemRole);

      await expect(
        service.update(id, { name: 'New Name' }, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete role when no active users are assigned', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const role = { id, code: 'CUSTOM', isSystem: false, users: [] };

      repository.findOne.mockResolvedValue(role);
      repository.softRemove.mockResolvedValue(role);

      const result = await service.remove(id, orgId);

      expect(repository.softRemove).toHaveBeenCalledWith(role);
      expect(result).toEqual({ message: 'Đã xóa vai trò thành công' });
    });

    it('should throw BadRequestException when trying to delete system role', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const role = { id, code: 'ADMIN', isSystem: true };

      repository.findOne.mockResolvedValue(role);

      await expect(service.remove(id, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ROLE_HAS_ASSIGNED_USERS warning when users are assigned and force is false', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const role = {
        id,
        code: 'CUSTOM',
        isSystem: false,
        users: [{ id: 'user1' }],
      };

      repository.findOne.mockResolvedValue(role);

      await expect(service.remove(id, orgId)).rejects.toThrow(
        new BadRequestException({
          code: 'ROLE_HAS_ASSIGNED_USERS',
          message: 'Vai trò này hiện đang được gán cho 1 nhân viên.',
          details: { count: 1 },
        }),
      );
    });

    it('should clear users mapping and soft delete when force is true', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const role = {
        id,
        code: 'CUSTOM',
        isSystem: false,
        users: [{ id: 'user1' }],
      };

      repository.findOne.mockResolvedValue(role);
      repository.save.mockResolvedValue({ ...role, users: [] });
      repository.softRemove.mockResolvedValue({ ...role, users: [] });

      const result = await service.remove(id, orgId, true);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ users: [] }),
      );
      expect(repository.softRemove).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Đã xóa vai trò thành công' });
    });
  });

  describe('assignPermissions', () => {
    it('should assign role permissions inside a database transaction', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const role = { id, code: 'CUSTOM', isSystem: false };
      const dto = {
        permissions: [
          { permissionId: 'p1-uuid', scope: 'ALL' as any },
          { permissionId: 'p2-uuid', scope: 'OWN' as any },
        ],
      };

      repository.findOne.mockResolvedValue(role);
      mockEntityManager.delete.mockResolvedValue({ affected: 2 });
      mockEntityManager.save.mockResolvedValue([]);

      const result = await service.assignPermissions(id, dto, orgId);

      expect(repository.findOne).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.delete).toHaveBeenCalledWith(expect.anything(), {
        roleId: role.id,
      });
      expect(mockEntityManager.create).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Gán quyền cho vai trò thành công' });
    });

    it('should throw BadRequestException if role is system role', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const systemRole = { id, code: 'ADMIN', isSystem: true };
      const dto = { permissions: [] };

      repository.findOne.mockResolvedValue(systemRole);

      await expect(service.assignPermissions(id, dto, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
