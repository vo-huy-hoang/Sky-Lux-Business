import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RoleScope } from '../../common/enums';

describe('RBAC Security & Tenant Boundary (Integration)', () => {
  let controller: RolesController;
  let roleRepository: jest.Mocked<Repository<Role>>;

  // Shared constants for tests
  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';
  const systemRole = {
    id: 'system-role-uuid',
    code: 'SUPER_ADMIN',
    isSystem: true,
    organizationId: orgA,
  } as Role;

  // Mock repositories
  const mockRoleRepository = {
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
  } as unknown as EntityManager;

  const mockDataSource = {
    transaction: jest.fn((cb: (em: EntityManager) => Promise<any>) =>
      cb(mockEntityManager),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    roleRepository = module.get<Repository<Role>>(
      getRepositoryToken(Role),
    ) as jest.Mocked<Repository<Role>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu giữa các doanh nghiệp (Multi-tenancy isolation)', () => {
    const roleOfOrgB = 'role-of-org-B';

    it('Doanh nghiệp A KHÔNG THỂ truy cập chi tiết vai trò của Doanh nghiệp B (Trả về 404)', async () => {
      roleRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === roleOfOrgB && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: roleOfOrgB,
          organizationId: orgB,
          code: 'SALES',
        } as Role);
      });

      await expect(controller.findOne(roleOfOrgB, orgA)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Doanh nghiệp A KHÔNG THỂ chỉnh sửa (update) vai trò của Doanh nghiệp B', async () => {
      roleRepository.findOne.mockResolvedValue(null);
      await expect(
        controller.update(roleOfOrgB, { name: 'Hack Name' }, orgA),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ xóa vai trò của Doanh nghiệp B', async () => {
      roleRepository.findOne.mockResolvedValue(null);
      await expect(controller.remove(roleOfOrgB, orgA)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Doanh nghiệp A KHÔNG THỂ trùng mã code vai trò với vai trò tùy chỉnh khác cùng doanh nghiệp', async () => {
      const dto = { code: 'SALES', name: 'Nhân viên kinh doanh mới' };
      roleRepository.findOne.mockResolvedValue({
        id: 'existing-id',
        code: 'SALES',
        organizationId: orgA,
      } as Role);

      await expect(controller.create(dto, orgA)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('2. Bảo vệ vai trò hệ thống (System Roles Protection)', () => {
    beforeEach(() => {
      roleRepository.findOne.mockResolvedValue(systemRole);
    });

    it('KHÔNG THỂ cập nhật (update) các vai trò mặc định của hệ thống (isSystem = true)', async () => {
      await expect(
        controller.update(systemRole.id, { name: 'Super Admin Hack' }, orgA),
      ).rejects.toThrow(
        new BadRequestException(
          'Không thể chỉnh sửa vai trò mặc định của hệ thống',
        ),
      );
    });

    it('KHÔNG THỂ xóa (delete) các vai trò mặc định của hệ thống (isSystem = true)', async () => {
      await expect(controller.remove(systemRole.id, orgA)).rejects.toThrow(
        new BadRequestException('Không thể xóa vai trò mặc định của hệ thống'),
      );
    });

    it('KHÔNG THỂ gán hoặc thay đổi quyền của vai trò mặc định hệ thống', async () => {
      const dto = {
        permissions: [{ permissionId: 'p1', scope: RoleScope.ALL }],
      };
      await expect(
        controller.assignPermissions(systemRole.id, dto, orgA),
      ).rejects.toThrow(
        new BadRequestException(
          'Không thể gán hoặc thay đổi quyền hạn của vai trò mặc định hệ thống',
        ),
      );
    });
  });

  describe('3. Xác thực cơ chế Cảnh báo xóa thông minh (Dynamic Deletion Warning)', () => {
    const roleId = 'custom-role-uuid';
    const baseCustomRole = {
      id: roleId,
      code: 'ACCOUNTANT',
      isSystem: false,
      organizationId: orgA,
    };

    it('Chặn và trả về cảnh báo ROLE_HAS_ASSIGNED_USERS nếu có nhân viên đang mang vai trò', async () => {
      const roleWithUsers = {
        ...baseCustomRole,
        users: [{ id: 'user1-uuid' }, { id: 'user2-uuid' }],
      } as Role;

      roleRepository.findOne.mockResolvedValue(roleWithUsers);

      await expect(controller.remove(roleId, orgA, 'false')).rejects.toThrow(
        new BadRequestException({
          code: 'ROLE_HAS_ASSIGNED_USERS',
          message: 'Vai trò này hiện đang được gán cho 2 nhân viên.',
          details: { count: 2 },
        }),
      );
    });

    it('Cho phép xóa vai trò nếu cờ force=true được kích hoạt (đồng thời xóa liên kết user)', async () => {
      const roleWithUsers = {
        ...baseCustomRole,
        users: [{ id: 'user1-uuid' }],
      } as Role;

      roleRepository.findOne.mockResolvedValue(roleWithUsers);
      roleRepository.save.mockResolvedValue({
        ...roleWithUsers,
        users: [],
      } as Role);
      roleRepository.softRemove.mockResolvedValue({
        ...roleWithUsers,
        users: [],
      } as Role);

      const result = await controller.remove(roleId, orgA, 'true');

      expect(roleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ users: [] }),
      );
      expect(roleRepository.softRemove).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Đã xóa vai trò thành công' });
    });
  });
});
