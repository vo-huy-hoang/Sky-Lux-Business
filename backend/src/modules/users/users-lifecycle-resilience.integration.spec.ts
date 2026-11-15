import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Department } from '../departments/entities/department.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../../common/redis/redis.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UserStatus } from '../../common/enums';

describe('IAM & RBAC User-Role Lifecycle Resilience (Integration Spec)', () => {
  let usersService: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;

  const orgId = 'org-sky-lux-uuid';
  const roleSalesId = 'role-sales-uuid';
  const roleOperatorId = 'role-operator-uuid';

  // In-memory simulated database state
  let simulatedRoles: Map<string, Role>;
  let simulatedUsers: Map<string, User>;

  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Reset database simulation
    simulatedRoles = new Map<string, Role>([
      [
        roleSalesId,
        {
          id: roleSalesId,
          code: 'SALES',
          name: 'Chuyên Viên Sale',
          organizationId: orgId,
          isSystem: false,
          deletedAt: null,
        } as unknown as Role,
      ],
      [
        roleOperatorId,
        {
          id: roleOperatorId,
          code: 'OPERATOR',
          name: 'Chuyên Viên Điều Hành',
          organizationId: orgId,
          isSystem: false,
          deletedAt: null,
        } as unknown as Role,
      ],
    ]);

    simulatedUsers = new Map<string, User>([
      [
        'user-sales-1',
        {
          id: 'user-sales-1',
          fullName: 'Hà Đức Lâm',
          email: 'haduclam@skylux.vn',
          employeeCode: 'SALES_001',
          organizationId: orgId,
          status: UserStatus.ACTIVE,
          roles: [simulatedRoles.get(roleSalesId)!],
          deletedAt: null,
        } as unknown as User,
      ],
      [
        'user-sales-2',
        {
          id: 'user-sales-2',
          fullName: 'Nguyễn Văn B',
          email: 'vanb@skylux.vn',
          employeeCode: 'SALES_002',
          organizationId: orgId,
          status: UserStatus.ACTIVE,
          roles: [simulatedRoles.get(roleSalesId)!],
          deletedAt: null,
        } as unknown as User,
      ],
      [
        'user-no-role',
        {
          id: 'user-no-role',
          fullName: 'Nhân Viên Mới Chưa Gán Role',
          email: 'newbie@skylux.vn',
          employeeCode: 'STAFF_003',
          organizationId: orgId,
          status: UserStatus.ACTIVE,
          roles: [],
          deletedAt: null,
        } as unknown as User,
      ],
    ]);

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockImplementation(async () => {
        // Return non-deleted simulated users for directory listing
        const activeUsers = Array.from(simulatedUsers.values()).filter(
          (u) => !u.deletedAt,
        );
        return [activeUsers, activeUsers.length];
      }),
    };

    const mockUserRepo: any = {
      manager: {
        transaction: jest.fn(async (cb: any) => cb(mockUserRepo)),
      },
      findOne: jest.fn().mockImplementation(async (options: any) => {
        const where = options?.where ?? options;
        const withDeleted = options?.withDeleted ?? false;
        let user: User | undefined;
        if (where.id) {
          user = simulatedUsers.get(where.id);
        } else if (where.email) {
          user = Array.from(simulatedUsers.values()).find(
            (u) => u.email === where.email,
          );
        } else if (where.employeeCode) {
          user = Array.from(simulatedUsers.values()).find(
            (u) =>
              u.employeeCode === where.employeeCode &&
              (!where.organizationId || u.organizationId === where.organizationId),
          );
        }
        if (!user || (user.deletedAt && !withDeleted)) return null;
        // Return cloned object with loaded relations
        return {
          ...user,
          roles: [...(user.roles || [])],
        };
      }),
      save: jest.fn().mockImplementation(async (target: User) => {
        simulatedUsers.set(target.id, target);
        return target;
      }),
      recover: jest.fn().mockImplementation(async (target: User) => {
        (target as any).deletedAt = null;
        simulatedUsers.set(target.id, target);
        return target;
      }),
      create: jest.fn().mockImplementation((dto: any) => {
        return {
          id: `new-user-${Date.now()}`,
          ...dto,
        } as unknown as User;
      }),
      softRemove: jest.fn().mockImplementation(async (target: User) => {
        // Ticket 01 Invariant Assertion: target.roles MUST be detached prior to softRemove
        // so TypeORM can never cascade soft-removal to related Role records!
        expect(target.roles).toEqual([]);

        target.deletedAt = new Date();
        simulatedUsers.set(target.id, target);
        return target;
      }),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockRoleRepo = {
      findOne: jest.fn().mockImplementation(async ({ where }: any) => {
        const role = Array.from(simulatedRoles.values()).find(
          (r) =>
            (!where.id || r.id === where.id) &&
            (!where.code || r.code === where.code) &&
            (!where.organizationId || r.organizationId === where.organizationId),
        );
        if (!role || (role.deletedAt && !where.withDeleted)) return null;
        return role;
      }),
      find: jest.fn().mockImplementation(async (options?: any) => {
        const where = options?.where;
        let roles = Array.from(simulatedRoles.values()).filter((r) => !r.deletedAt);
        if (where?.id) {
          const ids = where.id?._value ?? where.id;
          if (Array.isArray(ids)) {
            roles = roles.filter((r) => ids.includes(r.id));
          } else {
            roles = roles.filter((r) => r.id === ids);
          }
        }
        if (where?.organizationId) {
          roles = roles.filter((r) => r.organizationId === where.organizationId);
        }
        return roles;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: { update: jest.fn().mockResolvedValue({ affected: 1 }) },
        },
        {
          provide: getRepositoryToken(Department),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: orgId }) },
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RedisService,
          useValue: { del: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  describe('Test Case 1 & 2: User Deletion Lifecycle & Role Retention Isolation', () => {
    it('Xóa nhân viên "Hà Đức Lâm" (role SALES) KHÔNG làm mất vai trò SALES của công ty', async () => {
      // 1. Assert role SALES is active before deletion
      const roleBefore = await roleRepo.findOne({
        where: { id: roleSalesId, organizationId: orgId },
      });
      expect(roleBefore).toBeDefined();
      expect(roleBefore?.code).toBe('SALES');
      expect(roleBefore?.deletedAt).toBeNull();

      // 2. Perform deletion of employee 'user-sales-1'
      const removeResult = await usersService.remove(
        orgId,
        'user-sales-1',
        'actor-ceo-uuid',
        ['CEO_ADMIN'],
      );
      expect(removeResult.data.deleted).toBe(true);
      expect(userRepo.softRemove).toHaveBeenCalled();

      // 3. Verify target employee is marked deleted
      const deletedUser = simulatedUsers.get('user-sales-1');
      expect(deletedUser?.deletedAt).toBeInstanceOf(Date);

      // 4. CRITICAL ASSERTION: The shared Role 'SALES' MUST remain intact and not deleted!
      const roleAfter = simulatedRoles.get(roleSalesId);
      expect(roleAfter?.deletedAt).toBeNull();

      // 5. Test Case 2: Verify other team member 'user-sales-2' still retains active role SALES
      const colleagueUser = simulatedUsers.get('user-sales-2');
      expect(colleagueUser?.deletedAt).toBeNull();
      expect(colleagueUser?.roles).toHaveLength(1);
      expect(colleagueUser?.roles[0].code).toBe('SALES');
      expect(colleagueUser?.roles[0].deletedAt).toBeNull();
    });
  });

  describe('Test Case 3 & 4: Staff Directory Visibility Resilience (Anti-Ghosting)', () => {
    it('CEO_ADMIN gọi findAll phải hiển thị đầy đủ nhân viên chưa gán vai trò, không bị inner join tàng hình', async () => {
      const result = await usersService.findAll(
        orgId,
        new QueryUserDto(),
        ['CEO_ADMIN'],
      );

      // Assert QueryBuilder calls
      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls;

      // 1. Verify strict role.code IN ('OPERATOR', 'SALES') is NOT present (no inner join conversion)
      const hasInnerJoinRoleCode = andWhereCalls.some(([clause]: [any]) =>
        typeof clause === 'string' &&
        clause.includes('role.code IN (:...staffRoleCodes)'),
      );
      expect(hasInnerJoinRoleCode).toBe(false);

      // 2. Verify security anti-join subquery is applied to exclude elevated CEO_ADMIN / SUPER_ADMIN accounts
      const hasSecurityAntiJoin = andWhereCalls.some(([clause]: [any]) =>
        typeof clause === 'string' &&
        clause.includes('NOT EXISTS') &&
        clause.includes('elevated_user_role'),
      );
      expect(hasSecurityAntiJoin).toBe(true);

      // 3. Verify that the unassigned employee 'user-no-role' is present in directory output
      const unassignedUser = result.data.find((u) => u.id === 'user-no-role');
      expect(unassignedUser).toBeDefined();
      expect(unassignedUser?.fullName).toBe('Nhân Viên Mới Chưa Gán Role');
      expect(unassignedUser?.roles).toEqual([]);

      // 4. Verify total returned employees count includes all active non-elevated staff
      expect(result.data).toHaveLength(3);
    });
  });

  describe('Test Case 5: Smart Auto-Recovery of Soft-Deleted Account (Historical Continuity)', () => {
    it('khi tạo lại người dùng bằng email đã bị xóa mềm, hệ thống tự động recover, bảo lưu ID và lịch sử dữ liệu cũ', async () => {
      // 1. Employee 'user-sales-1' with email 'haduclam@skylux.vn' is deleted
      await usersService.remove(
        orgId,
        'user-sales-1',
        'actor-ceo-uuid',
        ['CEO_ADMIN'],
      );
      const userBeforeRecover = simulatedUsers.get('user-sales-1');
      expect(userBeforeRecover?.deletedAt).toBeInstanceOf(Date);

      // 2. CEO adds the employee back using the same email
      const recreateResult = await usersService.create(
        orgId,
        {
          fullName: 'HÀ ĐỨC LÂM (RECOVERED)',
          email: 'haduclam@skylux.vn',
          roleIds: [roleSalesId],
        },
        'actor-ceo-uuid',
        ['CEO_ADMIN'],
      );

      // 3. Verify user ID is preserved (historical continuity for past tours/estimates)
      expect(recreateResult.data.id).toBe('user-sales-1');
      expect(recreateResult.data.email).toBe('haduclam@skylux.vn');
      expect(recreateResult.data.fullName).toBe('HÀ ĐỨC LÂM (RECOVERED)');
      expect(recreateResult.data.status).toBe(UserStatus.ACTIVE);
      expect(recreateResult.data.temporaryPassword).toBeDefined();

      // 4. Verify in simulated DB that deletedAt is cleared and roles reattached
      const userAfterRecover = simulatedUsers.get('user-sales-1');
      expect(userAfterRecover?.deletedAt).toBeNull();
      expect(userAfterRecover?.status).toBe(UserStatus.ACTIVE);
      expect(userAfterRecover?.mustChangePassword).toBe(true);
      expect(userAfterRecover?.authVersion).toBe(
        (userBeforeRecover?.authVersion ?? 0) + 1,
      );
      expect(userAfterRecover?.roles).toHaveLength(1);
      expect(userAfterRecover?.roles[0].code).toBe('SALES');
    });
  });
});
