import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { RolePermission } from '../../modules/permissions/entities/role-permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { RoleScope, UserStatus } from '../../common/enums';
import { PERMISSION_CATALOG } from './permissions.catalog';

export const ORGANIZATION = {
  code: 'SKYLUX',
  name: 'Sky-Lux Travel Corporation',
  slug: 'sky-lux-travel',
  status: 'ACTIVE',
  timezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
} as const;

export interface BootstrapInput {
  email: string;
  fullName: string;
  password?: string;
  passwordConfirmation?: string;
}

export interface BootstrapOptions {
  apply: boolean;
  onStage?: (stage: string) => Promise<void>;
}

export interface BootstrapResult {
  status: 'planned' | 'created' | 'already_bootstrapped';
  email?: string;
  employeeCode?: string;
  permissionsToCreate: number;
  rolePermissionsToCreate: number;
}

const REQUIRED_SCHEMA: Record<string, string[]> = {
  organizations: [
    'id',
    'code',
    'name',
    'slug',
    'status',
    'timezone',
    'currency',
  ],
  organization_settings: ['id', 'organization_id', 'key', 'value'],
  departments: ['id', 'organization_id', 'code', 'name', 'status'],
  users: [
    'id',
    'organization_id',
    'employee_code',
    'full_name',
    'email',
    'password_hash',
    'status',
  ],
  roles: ['id', 'organization_id', 'code', 'name', 'is_system'],
  permissions: ['id', 'code', 'name', 'module'],
  role_permissions: ['id', 'role_id', 'permission_id', 'scope'],
  user_roles: ['user_id', 'role_id'],
  migrations: ['id', 'timestamp', 'name'],
};

const REQUIRED_UNIQUE_INDEXES: Record<string, string[]> = {
  organizations: ['(code)', '(slug)'],
  permissions: ['(code)'],
  users: ['(email)', '(organization_id, employee_code)'],
  role_permissions: ['(role_id, permission_id)'],
  user_roles: ['(user_id, role_id)'],
};

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    normalized.length > 255
  ) {
    throw new Error('Email không hợp lệ.');
  }
  return normalized;
}

export function validateProductionDatabaseEnvironment(
  environment: NodeJS.ProcessEnv,
): void {
  if (environment.NODE_ENV !== 'production') {
    throw new Error(
      'CLI chỉ chạy khi NODE_ENV=production. Không có fallback sang cấu hình local.',
    );
  }
  const missing = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ].filter((key) => !environment[key]?.trim());
  if (missing.length)
    throw new Error(`Thiếu cấu hình kết nối database: ${missing.join(', ')}.`);
  if (
    !/^\d+$/.test(environment.DB_PORT!) ||
    Number(environment.DB_PORT) < 1 ||
    Number(environment.DB_PORT) > 65535
  ) {
    throw new Error('DB_PORT không hợp lệ.');
  }
}

export function validateBootstrapInput(
  input: BootstrapInput,
  requirePassword = true,
): BootstrapInput {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  if (fullName.length < 2 || fullName.length > 255) {
    throw new Error('Họ tên phải có từ 2 đến 255 ký tự.');
  }
  if (!requirePassword) return { ...input, email, fullName };
  if (
    !input.password ||
    !input.passwordConfirmation ||
    input.password !== input.passwordConfirmation
  ) {
    throw new Error('Hai lần nhập mật khẩu không khớp.');
  }
  if (
    input.password.length < 14 ||
    !/[a-z]/.test(input.password) ||
    !/[A-Z]/.test(input.password) ||
    !/[0-9]/.test(input.password) ||
    !/[^A-Za-z0-9]/.test(input.password) ||
    /\s/.test(input.password)
  ) {
    throw new Error(
      'Mật khẩu cần ít nhất 14 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt; không chứa khoảng trắng.',
    );
  }
  return { ...input, email, fullName };
}

async function verifySchema(queryRunner: QueryRunner): Promise<void> {
  const missing: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
    if (!(await queryRunner.hasTable(table))) {
      missing.push(`table ${table}`);
      continue;
    }
    for (const column of columns) {
      if (!(await queryRunner.hasColumn(table, column)))
        missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) {
    throw new Error(`Schema không tương thích; thiếu ${missing.join(', ')}.`);
  }
  for (const [table, keyGroups] of Object.entries(REQUIRED_UNIQUE_INDEXES)) {
    const indexes: Array<{ indexdef: string }> = await queryRunner.query(
      'SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = $1',
      [table],
    );
    const definitions = indexes.map(({ indexdef }) =>
      indexdef.toLowerCase().replaceAll('"', '').replace(/\s+/g, ' '),
    );
    for (const keys of keyGroups) {
      if (
        !definitions.some(
          (definition) =>
            definition.includes('create unique index') &&
            definition.includes(keys),
        )
      ) {
        throw new Error(
          `Schema không tương thích; thiếu unique index ${table}${keys}.`,
        );
      }
    }
  }
  const [{ server_version_num: version }] = await queryRunner.query(
    'SHOW server_version_num',
  );
  if (Number(version) < 160000 || Number(version) >= 170000) {
    throw new Error(`Yêu cầu PostgreSQL 16; phiên bản hiện tại là ${version}.`);
  }
}

async function nextEmployeeCode(
  manager: EntityManager,
  organizationId: string,
): Promise<string> {
  const users = await manager.getRepository(User).find({
    select: { employeeCode: true },
    where: { organizationId },
    withDeleted: true,
  });
  const used = new Set(users.map(({ employeeCode }) => employeeCode));
  for (let index = 1; index <= 999999; index += 1) {
    const code = `SLX-ADMIN-${String(index).padStart(3, '0')}`;
    if (!used.has(code)) return code;
  }
  throw new Error('Không thể cấp employee code duy nhất.');
}

async function inspectAndPlan(manager: EntityManager, input: BootstrapInput) {
  const organizations = manager.getRepository(Organization);
  const permissions = manager.getRepository(Permission);
  const roles = manager.getRepository(Role);
  const users = manager.getRepository(User);
  const rolePermissions = manager.getRepository(RolePermission);

  const organization = await organizations.findOne({
    where: { code: ORGANIZATION.code },
    withDeleted: true,
  });
  const slugOwner = await organizations.findOne({
    where: { slug: ORGANIZATION.slug },
    withDeleted: true,
  });
  if (slugOwner && slugOwner.code !== ORGANIZATION.code) {
    throw new Error(`Slug ${ORGANIZATION.slug} đã thuộc về một tổ chức khác.`);
  }
  if (
    organization &&
    Object.entries(ORGANIZATION).some(
      ([key, value]) => organization[key as keyof Organization] !== value,
    )
  ) {
    throw new Error(
      'Organisation SKYLUX existante incompatible; aucune donnée ne sera modifiée.',
    );
  }
  if (organization?.deletedAt)
    throw new Error('Tổ chức SKYLUX đã bị xóa mềm; bootstrap dừng an toàn.');

  const normalizedEmail = normalizeEmail(input.email);
  const organizationRoles = organization
    ? await roles.find({
        where: { organizationId: organization.id },
        withDeleted: true,
      })
    : [];
  const existingRoles = organizationRoles.filter(
    ({ code }) => code === 'SUPER_ADMIN',
  );
  if (existingRoles.length > 1)
    throw new Error(
      'Database có nhiều vai trò SUPER_ADMIN trong SKYLUX; bootstrap dừng.',
    );
  const role = existingRoles[0] ?? null;
  if (
    role &&
    (!role.isSystem || role.name !== 'Quản Trị Viên Hệ Thống' || role.deletedAt)
  ) {
    throw new Error(
      'Vai trò SUPER_ADMIN hiện có không tương thích; bootstrap đã dừng.',
    );
  }
  let rolePermissionRows: RolePermission[] = [];
  if (organization) {
    const organizationUsers = await users.count({
      where: { organizationId: organization.id },
      withDeleted: true,
    });
    const nonSuperAdminRoles = organizationRoles.filter(
      ({ code }) => code !== 'SUPER_ADMIN',
    );
    if (nonSuperAdminRoles.length) {
      throw new Error(
        'SKYLUX đã có role khác SUPER_ADMIN; bootstrap đầu tiên bị từ chối trước khi ghi.',
      );
    }
    if (role) {
      rolePermissionRows = await rolePermissions.find({
        where: { roleId: role.id },
        withDeleted: true,
      });
      const deletedAssignment = rolePermissionRows.find(
        ({ deletedAt }) => deletedAt,
      );
      if (deletedAssignment)
        throw new Error(
          'SUPER_ADMIN có permission assignment đã xóa mềm; bootstrap dừng an toàn.',
        );
      const nonAllAssignment = rolePermissionRows.find(
        ({ scope }) => scope !== RoleScope.ALL,
      );
      if (nonAllAssignment)
        throw new Error(
          'SUPER_ADMIN có permission assignment không thuộc scope ALL; bootstrap dừng an toàn.',
        );
      const assignmentPermissionIds = rolePermissionRows.map(
        ({ permissionId }) => permissionId,
      );
      if (
        new Set(assignmentPermissionIds).size !== assignmentPermissionIds.length
      ) {
        throw new Error(
          'SUPER_ADMIN có permission assignment trùng; bootstrap dừng an toàn.',
        );
      }
    }
    if (!role && organizationUsers > 0) {
      throw new Error(
        'SKYLUX đã có user nhưng chưa có SUPER_ADMIN; bootstrap đầu tiên bị từ chối trước khi ghi.',
      );
    }
    if (!role && organizationRoles.length > 0) {
      throw new Error(
        'SKYLUX đã có role nhưng chưa có SUPER_ADMIN; bootstrap đầu tiên bị từ chối trước khi ghi.',
      );
    }
    if (role) {
      const existingAdmins = await manager
        .createQueryBuilder()
        .select('u.email', 'email')
        .addSelect('u.employee_code', 'employeeCode')
        .addSelect('u.status', 'status')
        .from('users', 'u')
        .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
        .where(
          'u.organization_id = :organizationId AND ur.role_id = :roleId AND u.deleted_at IS NULL',
          {
            organizationId: organization.id,
            roleId: role.id,
          },
        )
        .getRawMany();
      if (existingAdmins.length > 1) {
        throw new Error(
          'Có nhiều tài khoản SUPER_ADMIN; trạng thái không phù hợp với bootstrap đầu tiên.',
        );
      }
      if (existingAdmins.length === 1) {
        if (organizationUsers !== 1 || organizationRoles.length !== 1) {
          throw new Error(
            'SKYLUX có user/role ngoài trạng thái bootstrap hoàn chỉnh; bootstrap dừng trước khi ghi.',
          );
        }
        if (existingAdmins[0].status !== UserStatus.ACTIVE) {
          throw new Error(
            'Tài khoản SUPER_ADMIN hiện có không ACTIVE; bootstrap không thay đổi trạng thái.',
          );
        }
        const permissionRows = await permissions.find({ withDeleted: true });
        const permissionIds = new Map(
          permissionRows.map(({ code, id, deletedAt }) => [
            code,
            { id, deletedAt },
          ]),
        );
        const linkedByPermissionId = new Map(
          rolePermissionRows.map(({ permissionId, scope, deletedAt }) => [
            permissionId,
            { scope, deletedAt },
          ]),
        );
        const incompleteCatalog = PERMISSION_CATALOG.filter(({ code }) => {
          const permission = permissionIds.get(code);
          const assignment =
            permission && linkedByPermissionId.get(permission.id);
          return (
            !permission ||
            permission.deletedAt ||
            !assignment ||
            assignment.deletedAt ||
            assignment.scope !== RoleScope.ALL
          );
        });
        if (incompleteCatalog.length) {
          throw new Error(
            `SUPER_ADMIN hiện có không đầy đủ catalog/scope ALL: ${incompleteCatalog.map(({ code }) => code).join(', ')}.`,
          );
        }
        return {
          alreadyBootstrapped: true as const,
          email: existingAdmins[0].email,
          employeeCode: existingAdmins[0].employeeCode,
          permissionCount: 0,
          rolePermissionCount: 0,
        };
      }
      if (organizationUsers > 0) {
        throw new Error(
          'SKYLUX đã có user nhưng chưa có SUPER_ADMIN đang hoạt động; bootstrap dừng an toàn.',
        );
      }
      if (organizationRoles.length > 0) {
        throw new Error(
          'SKYLUX có role SUPER_ADMIN nhưng chưa có admin; trạng thái một phần không an toàn.',
        );
      }
    }
  }

  const existingUser = await users.findOne({
    where: { email: normalizedEmail },
    withDeleted: true,
  });
  if (existingUser)
    throw new Error('Email đã tồn tại; bootstrap không sửa tài khoản hiện có.');

  const knownPermissions = await permissions.find({ withDeleted: true });
  const permissionByCode = new Map(
    knownPermissions.map((permission) => [permission.code, permission]),
  );
  const deletedCatalogPermissions = PERMISSION_CATALOG.filter(
    ({ code }) => permissionByCode.get(code)?.deletedAt,
  ).map(({ code }) => code);
  if (deletedCatalogPermissions.length) {
    throw new Error(
      `Permission đã bị xóa mềm; không thể khôi phục an toàn: ${deletedCatalogPermissions.join(', ')}.`,
    );
  }
  const missingPermissions = PERMISSION_CATALOG.filter(
    ({ code }) => !permissionByCode.has(code),
  );
  if (!organization) {
    const rolesCount = await roles.count({ withDeleted: true });
    const usersCount = await users.count({ withDeleted: true });
    if (rolesCount || usersCount) {
      throw new Error(
        'Database đã có role/user nhưng chưa có tổ chức SKYLUX; tiền điều kiện bootstrap không đạt.',
      );
    }
  }
  const employeeCode = organization
    ? await nextEmployeeCode(manager, organization.id)
    : 'SLX-ADMIN-001';
  const existingRolePermissionCodes = new Set(
    rolePermissionRows.map(({ permissionId }) => permissionId),
  );
  const permissionsToCreate = missingPermissions.length;
  const rolePermissionsToCreate = role
    ? PERMISSION_CATALOG.filter((permission) => {
        const existing = permissionByCode.get(permission.code);
        return !existing || !existingRolePermissionCodes.has(existing.id);
      }).length + missingPermissions.length
    : PERMISSION_CATALOG.length;
  return {
    alreadyBootstrapped: false as const,
    organization,
    role,
    permissionByCode,
    missingPermissions,
    employeeCode,
    permissionsToCreate,
    rolePermissionsToCreate,
  };
}

export async function runProductionAdminBootstrap(
  dataSource: DataSource,
  rawInput: BootstrapInput,
  options: BootstrapOptions,
): Promise<BootstrapResult> {
  const input = validateBootstrapInput(rawInput, options.apply);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    const pending = await dataSource.showMigrations();
    if (pending)
      throw new Error(
        'Có migration chưa được áp dụng; CLI không tự chạy migration.',
      );
    await queryRunner.startTransaction();
    await verifySchema(queryRunner);
    await queryRunner.query(
      "SELECT pg_advisory_xact_lock(hashtext('skylux-production-admin-bootstrap-v1'))",
    );
    const plan = await inspectAndPlan(queryRunner.manager, input);
    if (plan.alreadyBootstrapped) {
      await queryRunner.rollbackTransaction();
      return {
        status: 'already_bootstrapped',
        email: plan.email ?? input.email,
        employeeCode: plan.employeeCode,
        permissionsToCreate: 0,
        rolePermissionsToCreate: 0,
      };
    }
    if (!options.apply) {
      await queryRunner.rollbackTransaction();
      return {
        status: 'planned',
        email: input.email,
        employeeCode: plan.employeeCode,
        permissionsToCreate: plan.permissionsToCreate,
        rolePermissionsToCreate: plan.rolePermissionsToCreate,
      };
    }

    const manager = queryRunner.manager;
    const organization =
      plan.organization ??
      (await manager
        .getRepository(Organization)
        .save(manager.getRepository(Organization).create(ORGANIZATION)));
    await options.onStage?.('organization');
    const permissionRepo = manager.getRepository(Permission);
    const permissionByCode = new Map(plan.permissionByCode);
    for (const definition of plan.missingPermissions) {
      const permission = await permissionRepo.save(
        permissionRepo.create(definition),
      );
      permissionByCode.set(permission.code, permission);
    }
    await options.onStage?.('permissions');
    const roleRepo = manager.getRepository(Role);
    const role =
      plan.role ??
      (await roleRepo.save(
        roleRepo.create({
          organizationId: organization.id,
          code: 'SUPER_ADMIN',
          name: 'Quản Trị Viên Hệ Thống',
          isSystem: true,
        }),
      ));
    const rolePermissionRepo = manager.getRepository(RolePermission);
    const currentRolePermissions = await rolePermissionRepo.find({
      where: { roleId: role.id },
    });
    const assignedPermissionIds = new Set(
      currentRolePermissions.map(({ permissionId }) => permissionId),
    );
    for (const definition of PERMISSION_CATALOG) {
      const permission = permissionByCode.get(definition.code);
      if (!permission)
        throw new Error(`Permission catalog thiếu ${definition.code}.`);
      if (!assignedPermissionIds.has(permission.id)) {
        await rolePermissionRepo.save(
          rolePermissionRepo.create({
            roleId: role.id,
            permissionId: permission.id,
            scope: RoleScope.ALL,
          }),
        );
      }
    }
    await options.onStage?.('role-permissions');
    const passwordHash = await bcrypt.hash(input.password!, 12);
    const userRepo = manager.getRepository(User);
    const user = await userRepo.save(
      userRepo.create({
        organizationId: organization.id,
        employeeCode: plan.employeeCode,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        roles: [role],
        twoFactorEnabled: false,
        notificationPreferences: {},
      }),
    );
    void user;
    await options.onStage?.('admin');
    await queryRunner.commitTransaction();
    return {
      status: 'created',
      email: input.email,
      employeeCode: plan.employeeCode,
      permissionsToCreate: plan.permissionsToCreate,
      rolePermissionsToCreate: plan.rolePermissionsToCreate,
    };
  } catch (error) {
    if (queryRunner.isTransactionActive)
      await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
