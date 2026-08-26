import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, ILike } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { RoleScope } from '../../common/enums';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string, query: QueryRoleDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('role.organization_id = :organizationId', { organizationId })
      .orderBy('role.is_system', 'DESC')
      .addOrderBy('role.createdAt', 'ASC');

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(role.code ILIKE :keyword OR role.name ILIKE :keyword OR role.description ILIKE :keyword)',
        { keyword },
      );
    }

    const [roles, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const items = roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissionCount: r.rolePermissions?.length || 0,
      permissions:
        r.rolePermissions?.map((rp) => ({
          id: rp.permission?.id,
          code: rp.permission?.code,
          name: rp.permission?.name,
          module: rp.permission?.module,
          scope: rp.scope,
        })) || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(organizationId: string, id: string) {
    const role = await this.roleRepository.findOne({
      where: { id, organizationId },
      relations: {
        rolePermissions: {
          permission: true,
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID: ${id}`);
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions:
        role.rolePermissions?.map((rp) => ({
          id: rp.permission?.id,
          code: rp.permission?.code,
          name: rp.permission?.name,
          module: rp.permission?.module,
          scope: rp.scope,
        })) || [],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async create(
    organizationId: string,
    dto: CreateRoleDto,
    _actorUserId: string,
  ) {
    const code = dto.code.trim().toUpperCase();

    // Check duplicate code in this organization
    const existing = await this.roleRepository.findOne({
      where: { organizationId, code },
    });
    if (existing) {
      throw new ConflictException(
        `Mã vai trò "${code}" đã tồn tại trong tổ chức`,
      );
    }

    // Run creation in a database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const role = queryRunner.manager.create(Role, {
        organizationId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        isSystem: false,
      });

      const savedRole = await queryRunner.manager.save(Role, role);

      if (dto.permissionCodes && dto.permissionCodes.length > 0) {
        const permissions = await this.permissionRepository.find({
          where: { code: In(dto.permissionCodes) },
        });

        const rolePermissions = permissions.map((p) =>
          queryRunner.manager.create(RolePermission, {
            roleId: savedRole.id,
            permissionId: p.id,
            scope: RoleScope.ALL,
          }),
        );

        await queryRunner.manager.save(RolePermission, rolePermissions);
      }

      await queryRunner.commitTransaction();
      return this.findOne(organizationId, savedRole.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Lỗi khi tạo vai trò: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateRoleDto,
    _actorUserId: string,
  ) {
    const role = await this.roleRepository.findOne({
      where: { id, organizationId },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID: ${id}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.name) role.name = dto.name.trim();
      if (dto.description !== undefined)
        role.description = dto.description.trim();

      await queryRunner.manager.save(Role, role);

      if (dto.permissionCodes !== undefined) {
        // Remove old permissions and replace with new
        await queryRunner.manager.delete(RolePermission, { roleId: role.id });

        if (dto.permissionCodes.length > 0) {
          const permissions = await this.permissionRepository.find({
            where: { code: In(dto.permissionCodes) },
          });

          const rolePermissions = permissions.map((p) =>
            queryRunner.manager.create(RolePermission, {
              roleId: role.id,
              permissionId: p.id,
              scope: RoleScope.ALL,
            }),
          );

          await queryRunner.manager.save(RolePermission, rolePermissions);
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(organizationId, role.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Lỗi khi cập nhật vai trò: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async assignPermissions(
    organizationId: string,
    roleId: string,
    permissionCodes: string[],
    _actorUserId: string,
  ) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy vai trò với ID: ${roleId}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Clear existing permissions
      await queryRunner.manager.delete(RolePermission, { roleId: role.id });

      if (permissionCodes.length > 0) {
        const permissions = await this.permissionRepository.find({
          where: { code: In(permissionCodes) },
        });

        const newRolePermissions = permissions.map((p) =>
          queryRunner.manager.create(RolePermission, {
            roleId: role.id,
            permissionId: p.id,
            scope: RoleScope.ALL,
          }),
        );

        await queryRunner.manager.save(RolePermission, newRolePermissions);
      }

      await queryRunner.commitTransaction();
      return this.findOne(organizationId, role.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Lỗi khi gán quyền cho vai trò: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async assignUserRoles(
    organizationId: string,
    targetUserId: string,
    roleIds: string[],
    _actorUserId: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId, organizationId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID: ${targetUserId}`,
      );
    }

    // Verify all roleIds belong to the same organization
    if (roleIds.length > 0) {
      const roles = await this.roleRepository.find({
        where: { id: In(roleIds), organizationId },
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều vai trò không hợp lệ hoặc không thuộc tổ chức',
        );
      }

      user.roles = roles;
    } else {
      user.roles = [];
    }

    await this.userRepository.save(user);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
      })),
      updatedAt: user.updatedAt,
    };
  }
}
