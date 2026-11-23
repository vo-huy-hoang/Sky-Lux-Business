import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RoleScope } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';
import { RedisService } from '../../common/redis/redis.service';
import { AuthSessionStore } from '../auth/auth-session.store';
import {
  BASELINE_ROLE_PERMISSIONS,
  syncBaselinePermissionsForRole,
} from '../../database/bootstrap/baseline-role-permissions';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  private authSessionStore: AuthSessionStore;

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    @Optional()
    private readonly redisService?: RedisService,
    @Optional()
    authSessionStore?: AuthSessionStore,
  ) {
    this.authSessionStore =
      authSessionStore ??
      new AuthSessionStore(this.dataSource, this.redisService);
  }

  async create(
    createRoleDto: CreateRoleDto,
    organizationId: string,
    actorUserId?: string,
  ): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { organizationId, code: createRoleDto.code },
      withDeleted: true,
    });

    if (existingRole && !existingRole.deletedAt) {
      throw new ConflictException(
        `Mã vai trò "${createRoleDto.code}" đã tồn tại trong tổ chức`,
      );
    }

    if (existingRole?.deletedAt) {
      // Role codes remain unique across soft-deleted rows. Restore the prior role
      // so canonical codes such as SALES can be reused without a DB constraint error.
      existingRole.name = createRoleDto.name;
      existingRole.description = createRoleDto.description;
      const restoredRole = await this.roleRepository.recover(existingRole);
      const savedRole = await this.roleRepository.save(restoredRole);
      await this.ensureBaselinePermissionsForRole(savedRole);
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.ROLE_CREATED,
        entityType: AuditEntityType.ROLE,
        entityId: savedRole.id,
        afterData: this.auditSnapshot(savedRole),
      });
      return savedRole;
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      organizationId,
      isSystem: false,
    });

    let savedRole: Role;
    try {
      savedRole = await this.roleRepository.save(role);
      await this.ensureBaselinePermissionsForRole(savedRole);
    } catch (error: any) {
      // The unique constraint is the final guard against concurrent create requests.
      if (
        error?.code === '23505' &&
        error?.constraint === 'uq_roles_org_code'
      ) {
        throw new ConflictException(
          `Mã vai trò "${createRoleDto.code}" đã tồn tại trong tổ chức`,
        );
      }
      throw error;
    }
    await this.auditLogsService.record({
      organizationId,
      actorUserId,
      action: AuditAction.ROLE_CREATED,
      entityType: AuditEntityType.ROLE,
      entityId: savedRole.id,
      afterData: this.auditSnapshot(savedRole),
    });
    return savedRole;
  }

  async findAll(organizationId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { organizationId },
      order: { isSystem: 'DESC', code: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id, organizationId },
      relations: {
        rolePermissions: {
          permission: true,
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID "${id}"`);
    }

    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    organizationId: string,
    actorUserId?: string,
  ): Promise<Role> {
    const role = await this.findOne(id, organizationId);
    const beforeData = this.auditSnapshot(role);
    if (role.isSystem) {
      throw new BadRequestException(
        'Không thể chỉnh sửa vai trò mặc định của hệ thống',
      );
    }

    if (updateRoleDto.code && updateRoleDto.code !== role.code) {
      const exists = await this.roleRepository.findOne({
        where: { organizationId, code: updateRoleDto.code },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException(
          `Mã vai trò "${updateRoleDto.code}" đã tồn tại trong tổ chức`,
        );
      }
    }

    Object.assign(role, updateRoleDto);
    const savedRole = await this.roleRepository.save(role);
    await this.auditLogsService.record({
      organizationId,
      actorUserId,
      action: AuditAction.ROLE_UPDATED,
      entityType: AuditEntityType.ROLE,
      entityId: id,
      beforeData,
      afterData: this.auditSnapshot(savedRole),
    });
    return savedRole;
  }

  async remove(
    id: string,
    organizationId: string,
    force?: boolean,
    actorUserId?: string,
  ): Promise<{ message: string }> {
    const role = await this.roleRepository.findOne({
      where: { id, organizationId },
      relations: {
        users: true,
        rolePermissions: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID "${id}"`);
    }

    if (role.isSystem) {
      throw new BadRequestException(
        'Không thể xóa vai trò mặc định của hệ thống',
      );
    }

    // Đếm số người dùng đang gán vai trò này
    const count = role.users?.length || 0;

    if (count > 0 && !force) {
      throw new BadRequestException({
        code: 'ROLE_HAS_ASSIGNED_USERS',
        message: `Vai trò này hiện đang được gán cho ${count} nhân viên.`,
        details: { count },
      });
    }

    // Nếu đồng ý xóa bắt buộc (force), gỡ liên kết trong bảng trung gian user_roles trước
    if (count > 0 && force) {
      const affectedUserIds = role.users.map((user) => user.id);
      role.users = [];
      await this.roleRepository.save(role);

      // Revoke existing sessions so the removed role's permissions stop applying immediately.
      await this.authSessionStore.bumpAuthVersionAndInvalidate(affectedUserIds);
    }

    // Tiến hành xóa mềm vai trò
    await this.roleRepository.softRemove(role);

    await this.auditLogsService.record({
      organizationId,
      actorUserId,
      action: AuditAction.ROLE_DELETED,
      entityType: AuditEntityType.ROLE,
      entityId: id,
      beforeData: this.auditSnapshot(role),
    });

    return { message: 'Đã xóa vai trò thành công' };
  }

  async assignPermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
    organizationId: string,
    actorUserId?: string,
  ): Promise<{ message: string }> {
    const role = await this.findOne(id, organizationId);
    if (role.isSystem) {
      throw new BadRequestException(
        'Không thể gán hoặc thay đổi quyền hạn của vai trò mặc định hệ thống',
      );
    }

    // Thực hiện trong Transaction để đảm bảo tính nhất quán
    const previousPermissionIds = (role.rolePermissions ?? [])
      .map((permission) => permission.permissionId)
      .sort();
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Xóa toàn bộ liên kết quyền cũ của vai trò này
      await transactionalEntityManager.delete(RolePermission, {
        roleId: role.id,
      });

      // 2. Thêm mới danh sách quyền được tích chọn
      if (
        assignPermissionsDto.permissions &&
        assignPermissionsDto.permissions.length > 0
      ) {
        const rolePermissions = assignPermissionsDto.permissions.map((p) =>
          transactionalEntityManager.create(RolePermission, {
            roleId: role.id,
            permissionId: p.permissionId,
            scope: p.scope || RoleScope.ALL,
          }),
        );
        await transactionalEntityManager.save(RolePermission, rolePermissions);
      }

      await this.authSessionStore.bumpAuthVersionForRole(
        role.id,
        transactionalEntityManager,
      );
    });

    await this.auditLogsService.record({
      organizationId,
      actorUserId,
      action: AuditAction.ROLE_PERMISSIONS_CHANGED,
      entityType: AuditEntityType.ROLE,
      entityId: id,
      beforeData: { permissionIds: previousPermissionIds },
      afterData: {
        permissionIds: (assignPermissionsDto.permissions ?? [])
          .map((permission) => permission.permissionId)
          .sort(),
      },
    });

    return { message: 'Gán quyền cho vai trò thành công' };
  }

  /**
   * Lấy danh sách tất cả các quyền hạn hệ thống sắp xếp theo module và mã quyền.
   */
  async findAllPermissions(): Promise<Permission[]> {
    return this.dataSource.getRepository(Permission).find({
      order: { module: 'ASC', code: 'ASC' },
    });
  }

  async ensureBaselinePermissionsForRole(role: Role): Promise<void> {
    if (!this.dataSource?.manager) return;
    await syncBaselinePermissionsForRole(this.dataSource.manager, role);
  }

  private auditSnapshot(role: Role): Record<string, unknown> {
    return {
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      permissionIds: (role.rolePermissions ?? [])
        .map((permission) => permission.permissionId)
        .sort(),
    };
  }
}
