import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { RoleScope } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createRoleDto: CreateRoleDto,
    organizationId: string,
    actorUserId?: string,
  ): Promise<Role> {
    const exists = await this.roleRepository.findOne({
      where: { organizationId, code: createRoleDto.code },
    });
    if (exists) {
      throw new ConflictException(
        `Mã vai trò "${createRoleDto.code}" đã tồn tại trong tổ chức`,
      );
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      organizationId,
      isSystem: false,
    });

    const savedRole = await this.roleRepository.save(role);
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
      role.users = [];
      await this.roleRepository.save(role);
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

      await transactionalEntityManager.query(
        `UPDATE "users" SET "auth_version" = "auth_version" + 1
         WHERE "id" IN (SELECT "user_id" FROM "user_roles" WHERE "role_id" = $1)`,
        [role.id],
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
