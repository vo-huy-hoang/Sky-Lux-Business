import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../roles/entities/role.entity';
import { Department } from '../departments/entities/department.entity';
import { UserStatus } from '../../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { Organization } from '../organizations/entities/organization.entity';
import { CreateCeoUserDto } from './dto/create-ceo-user.dto';
import { UpdateCeoUserDto } from './dto/update-ceo-user.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly auditLogsService: AuditLogsService,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  private async invalidateAuthMetaCache(userId: string): Promise<void> {
    if (!this.redisService) return;
    try {
      await this.redisService.del(`user:auth-meta:${userId}`);
    } catch (err: any) {
      this.logger.warn(
        `Failed to invalidate auth-meta cache for user ${userId}: ${err?.message || err}`,
      );
    }
  }

  /**
   * Helper function to sanitize user entity by removing sensitive fields like passwordHash
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    if (!user) return user;
    const { passwordHash: _passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Helper function to find user by ID and organization, throwing NotFoundException if not found
   */
  private async findUserOrFail(
    organizationId: string,
    id: string,
    withRelations = true,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, organizationId },
      relations: withRelations
        ? {
            department: true,
            roles: true,
          }
        : undefined,
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID "${id}"`);
    }

    return user;
  }

  /**
   * API-USERS-001: Lấy danh sách người dùng phân trang và lọc
   */
  async findAll(
    organizationId: string,
    queryDto: QueryUserDto = new QueryUserDto(),
    actorRoles?: string[],
  ) {
    const {
      page = 1,
      pageSize = 20,
      search,
      roleId,
      departmentId,
      status,
    } = queryDto;
    const limit = Math.min(Math.max(pageSize, 1), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.organizationId = :organizationId', { organizationId });

    if (
      actorRoles?.includes('CEO_ADMIN') &&
      !actorRoles.includes('SUPER_ADMIN')
    ) {
      queryBuilder.andWhere('role.code IN (:...staffRoleCodes)', {
        staffRoleCodes: ['OPERATOR', 'SALES'],
      });
      queryBuilder.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM user_roles elevated_user_role
          INNER JOIN roles elevated_role ON elevated_role.id = elevated_user_role.role_id
          WHERE elevated_user_role.user_id = "user"."id"
            AND elevated_role.code IN (:...restrictedRoleCodes)
        )`,
        { restrictedRoleCodes: ['CEO_ADMIN', 'SUPER_ADMIN'] },
      );
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (departmentId) {
      queryBuilder.andWhere('user.departmentId = :departmentId', {
        departmentId,
      });
    }

    if (roleId) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(user.fullName ILIKE :keyword OR user.employeeCode ILIKE :keyword OR user.email ILIKE :keyword OR user.phone ILIKE :keyword)',
        { keyword },
      );
    }

    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const sanitizedItems = items.map((user) => this.sanitizeUser(user));
    const totalPages = Math.ceil(total / limit);

    return {
      data: sanitizedItems,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  async findAllCeo(queryDto: QueryUserDto = new QueryUserDto()) {
    const { page = 1, pageSize = 20, search, status } = queryDto;
    const limit = Math.min(Math.max(pageSize, 1), 100);
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
      .where('role.code = :roleCode', { roleCode: 'CEO_ADMIN' })
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM user_roles super_admin_user_role
          INNER JOIN roles super_admin_role ON super_admin_role.id = super_admin_user_role.role_id
          WHERE super_admin_user_role.user_id = "user"."id"
            AND super_admin_role.code = :superAdminRoleCode
        )`,
        { superAdminRoleCode: 'SUPER_ADMIN' },
      );

    if (status) queryBuilder.andWhere('user.status = :status', { status });
    if (search?.trim()) {
      const keyword = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(user.fullName ILIKE :keyword OR user.employeeCode ILIKE :keyword OR user.email ILIKE :keyword OR user.phone ILIKE :keyword OR organization.name ILIKE :keyword)',
        { keyword },
      );
    }

    queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await queryBuilder.getManyAndCount();
    return {
      data: items.map((user) => {
        const { organization, ...safeUser } = this.sanitizeUser(user);
        return {
          ...safeUser,
          organization: organization
            ? {
                id: organization.id,
                name: organization.name,
                code: organization.code,
              }
            : undefined,
        };
      }),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async findCeoUserOrFail(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { department: true, roles: true, organization: true },
    });
    const roleCodes = user?.roles?.map((role) => role.code) ?? [];
    if (
      !user ||
      !roleCodes.includes('CEO_ADMIN') ||
      roleCodes.includes('SUPER_ADMIN')
    ) {
      throw new NotFoundException(
        `Không tìm thấy tài khoản CEO_ADMIN với ID "${id}"`,
      );
    }
    return user;
  }

  async updateCeo(
    id: string,
    dto: UpdateCeoUserDto,
    actorUserId: string,
    actorRoles: string[],
  ) {
    if (!actorRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Chỉ SUPER_ADMIN được cập nhật tài khoản CEO_ADMIN',
      );
    }
    const user = await this.findCeoUserOrFail(id);
    return this.update(user.organizationId, id, dto, actorUserId, actorRoles);
  }

  async removeCeo(id: string, actorUserId: string, actorRoles: string[]) {
    if (!actorRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Chỉ SUPER_ADMIN được xóa tài khoản CEO_ADMIN',
      );
    }
    const user = await this.findCeoUserOrFail(id);
    return this.remove(user.organizationId, id, actorUserId, actorRoles);
  }

  /**
   * API-USERS-002: Lấy chi tiết thông tin người dùng theo ID
   */
  async findOne(
    organizationId: string,
    id: string,
    actorUserId?: string,
    actorRoles?: string[],
  ) {
    const user = await this.findUserOrFail(organizationId, id, true);
    this.assertTenantStaffTarget(user, actorRoles);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_VIEWED,
        entityType: AuditEntityType.USER,
        entityId: id,
        afterData: { fields: ['email', 'phone', 'department', 'roles'] },
      });
    }

    return {
      data: this.sanitizeUser(user),
    };
  }

  /**
   * API-USERS-003: Tạo người dùng mới
   */
  async create(
    organizationId: string,
    createUserDto: CreateUserDto,
    actorUserId?: string,
    actorRoles?: string[],
    allowCeoProvisioning = false,
  ) {
    const {
      email,
      fullName,
      employeeCode,
      password,
      phone,
      avatarUrl,
      departmentId,
      roleIds,
      status = UserStatus.ACTIVE,
    } = createUserDto;

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra tính duy nhất của email
    const existingEmail = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Email "${normalizedEmail}" đã tồn tại trong hệ thống`,
      );
    }

    // 2. Kiểm tra hoặc sinh mã nhân viên
    let finalEmployeeCode = employeeCode?.trim();
    if (finalEmployeeCode) {
      const existingCode = await this.userRepository.findOne({
        where: { employeeCode: finalEmployeeCode, organizationId },
      });
      if (existingCode) {
        throw new ConflictException(
          `Mã nhân viên "${finalEmployeeCode}" đã tồn tại trong tổ chức`,
        );
      }
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalEmployeeCode = `EMP${Date.now().toString().slice(-4)}${randomSuffix}`;
    }

    // 3. Xác thực phòng ban nếu có
    if (departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: departmentId, organizationId },
      });
      if (!department) {
        throw new BadRequestException(
          'Phòng ban không hợp lệ hoặc không thuộc tổ chức của bạn',
        );
      }
    }

    // 4. Xác thực và gán vai trò nếu có
    let roles: Role[] = [];
    if (roleIds && roleIds.length > 0) {
      roles = await this.roleRepository.find({
        where: {
          id: In(roleIds),
          organizationId,
        },
      });
      if (roles.length !== roleIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều vai trò được chọn không hợp lệ hoặc không thuộc tổ chức của bạn',
        );
      }
    }

    if (actorRoles) {
      const roleCodes = roles.map((role) => role.code);
      if (actorRoles.includes('SUPER_ADMIN')) {
        if (
          !allowCeoProvisioning ||
          roleCodes.length !== 1 ||
          roleCodes[0] !== 'CEO_ADMIN'
        ) {
          throw new ForbiddenException(
            'SUPER_ADMIN chỉ được tạo tài khoản CEO_ADMIN qua API tạo CEO',
          );
        }
      } else if (actorRoles.includes('CEO_ADMIN')) {
        if (
          roleCodes.length !== 1 ||
          roleCodes.some((code) => !['OPERATOR', 'SALES'].includes(code))
        ) {
          throw new ForbiddenException(
            'CEO_ADMIN chỉ được tạo tài khoản OPERATOR hoặc SALES',
          );
        }
      } else {
        throw new ForbiddenException('Bạn không được phép tạo tài khoản');
      }
    }

    // 5. Băm mật khẩu (mặc định SkyLux@123 nếu không truyền)
    const rawPassword = password || 'SkyLux@123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 6. Tạo và lưu người dùng
    const user = this.userRepository.create({
      organizationId,
      departmentId,
      employeeCode: finalEmployeeCode,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      avatarUrl,
      status,
      passwordHash,
      roles,
    });

    const savedUser = await this.userRepository.save(user);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_CREATED,
        entityType: AuditEntityType.USER,
        entityId: savedUser.id,
        afterData: this.auditSnapshot(savedUser),
      });
    }

    return { data: this.sanitizeUser(savedUser) };
  }

  async createCeo(
    dto: CreateCeoUserDto,
    actorUserId: string,
    actorRoles: string[],
  ) {
    if (!actorRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Chỉ SUPER_ADMIN được tạo tài khoản CEO_ADMIN',
      );
    }
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException(
        `Không tìm thấy tổ chức với ID "${dto.organizationId}"`,
      );
    }
    const ceoRole = await this.roleRepository.findOne({
      where: { organizationId: organization.id, code: 'CEO_ADMIN' },
    });
    if (!ceoRole) {
      throw new BadRequestException(
        'Tổ chức chưa được khởi tạo vai trò CEO_ADMIN',
      );
    }
    const { organizationId: _organizationId, ...userFields } = dto;
    return this.create(
      organization.id,
      { ...userFields, roleIds: [ceoRole.id] },
      actorUserId,
      actorRoles,
      true,
    );
  }

  /**
   * API-USERS-004: Cập nhật thông tin người dùng
   */
  async update(
    organizationId: string,
    id: string,
    updateUserDto: UpdateUserDto,
    actorUserId?: string,
    actorRoles?: string[],
  ) {
    const user = await this.findUserOrFail(organizationId, id, true);
    this.assertTenantStaffTarget(user, actorRoles);
    const beforeData = this.auditSnapshot(user);
    const previousRoleIds = (user.roles ?? []).map((role) => role.id).sort();
    const previousStatus = user.status;

    const {
      email,
      fullName,
      employeeCode,
      password,
      phone,
      avatarUrl,
      departmentId,
      roleIds,
      status,
    } = updateUserDto;

    // 1. Cập nhật email nếu thay đổi
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existingEmail = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });
        if (existingEmail) {
          throw new ConflictException(
            `Email "${normalizedEmail}" đã tồn tại trong hệ thống`,
          );
        }
        user.email = normalizedEmail;
      }
    }

    // 2. Cập nhật mã nhân viên nếu thay đổi
    if (employeeCode) {
      const trimmedCode = employeeCode.trim();
      if (trimmedCode !== user.employeeCode) {
        const existingCode = await this.userRepository.findOne({
          where: { employeeCode: trimmedCode, organizationId },
        });
        if (existingCode) {
          throw new ConflictException(
            `Mã nhân viên "${trimmedCode}" đã tồn tại trong tổ chức`,
          );
        }
        user.employeeCode = trimmedCode;
      }
    }

    // 3. Cập nhật phòng ban nếu truyền
    if (departmentId !== undefined) {
      if (departmentId) {
        const department = await this.departmentRepository.findOne({
          where: { id: departmentId, organizationId },
        });
        if (!department) {
          throw new BadRequestException(
            'Phòng ban không hợp lệ hoặc không thuộc tổ chức của bạn',
          );
        }
        user.departmentId = departmentId;
      } else {
        user.departmentId = undefined;
      }
    }

    // 4. Cập nhật vai trò nếu truyền
    if (roleIds !== undefined) {
      if (roleIds.length > 0) {
        const roles = await this.roleRepository.find({
          where: {
            id: In(roleIds),
            organizationId,
          },
        });
        if (roles.length !== roleIds.length) {
          throw new BadRequestException(
            'Một hoặc nhiều vai trò được chọn không hợp lệ hoặc không thuộc tổ chức của bạn',
          );
        }
        this.assertAssignableRoles(actorRoles, roles);
        user.roles = roles;
      } else {
        this.assertAssignableRoles(actorRoles, []);
        user.roles = [];
      }
    }

    // 5. Cập nhật mật khẩu nếu có
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    // 6. Cập nhật các trường thông tin cơ bản khác
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone?.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (status !== undefined) user.status = status;

    const nextRoleIds = (user.roles ?? []).map((role) => role.id).sort();
    if (
      previousStatus !== user.status ||
      JSON.stringify(previousRoleIds) !== JSON.stringify(nextRoleIds) ||
      Boolean(password)
    ) {
      user.authVersion = (user.authVersion ?? 0) + 1;
    }

    const updatedUser = await this.userRepository.save(user);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_UPDATED,
        entityType: AuditEntityType.USER,
        entityId: id,
        beforeData,
        afterData: this.auditSnapshot(updatedUser),
      });
      const savedRoleIds = (updatedUser.roles ?? [])
        .map((role) => role.id)
        .sort();
      if (JSON.stringify(previousRoleIds) !== JSON.stringify(savedRoleIds)) {
        await this.auditLogsService.record({
          organizationId,
          actorUserId,
          action: AuditAction.USER_ROLES_CHANGED,
          entityType: AuditEntityType.USER,
          entityId: id,
          beforeData: { roleIds: previousRoleIds },
          afterData: { roleIds: nextRoleIds },
        });
      }
    }

    await this.invalidateAuthMetaCache(id);

    return {
      data: this.sanitizeUser(updatedUser),
    };
  }

  /**
   * API-USERS-005: Khóa tài khoản người dùng và thu hồi mọi phiên đăng nhập
   */
  async lockUser(
    organizationId: string,
    id: string,
    actorUserId?: string,
    actorRoles?: string[],
  ) {
    const user = await this.findUserOrFail(organizationId, id, true);
    this.assertTenantStaffTarget(user, actorRoles);

    user.status = UserStatus.LOCKED;
    user.authVersion = (user.authVersion ?? 0) + 1;
    const savedUser = await this.userRepository.save(user);

    // Thu hồi toàn bộ refresh token để hủy mọi phiên làm việc ngay lập tức
    await this.refreshTokenRepository.update(
      { userId: id, isRevoked: false },
      { isRevoked: true },
    );

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_UPDATED,
        entityType: AuditEntityType.USER,
        entityId: id,
        beforeData: { status: UserStatus.ACTIVE },
        afterData: { status: UserStatus.LOCKED },
      });
    }

    await this.invalidateAuthMetaCache(id);

    return {
      message: 'Đã khóa tài khoản và thu hồi tất cả phiên đăng nhập thành công',
      data: this.sanitizeUser(savedUser),
    };
  }

  /**
   * API-USERS-006: Mở khóa tài khoản người dùng
   */
  async unlockUser(
    organizationId: string,
    id: string,
    actorUserId?: string,
    actorRoles?: string[],
  ) {
    const user = await this.findUserOrFail(organizationId, id, true);
    this.assertTenantStaffTarget(user, actorRoles);

    user.status = UserStatus.ACTIVE;
    user.authVersion = (user.authVersion ?? 0) + 1;
    const savedUser = await this.userRepository.save(user);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_UPDATED,
        entityType: AuditEntityType.USER,
        entityId: id,
        beforeData: { status: UserStatus.LOCKED },
        afterData: { status: UserStatus.ACTIVE },
      });
    }

    await this.invalidateAuthMetaCache(id);

    return {
      message: 'Đã mở khóa tài khoản thành công',
      data: this.sanitizeUser(savedUser),
    };
  }

  /**
   * API-USERS-007: Xóa người dùng (Soft delete)
   */
  async remove(
    organizationId: string,
    id: string,
    actorUserId?: string,
    actorRoles?: string[],
  ) {
    const user = await this.findUserOrFail(organizationId, id, true);
    this.assertTenantStaffTarget(user, actorRoles);
    const beforeData = this.auditSnapshot(user);

    // Thu hồi toàn bộ phiên đăng nhập trước khi xóa
    await this.refreshTokenRepository.update(
      { userId: id, isRevoked: false },
      { isRevoked: true },
    );

    user.authVersion = (user.authVersion ?? 0) + 1;
    await this.userRepository.save(user);
    await this.userRepository.softRemove(user);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_DELETED,
        entityType: AuditEntityType.USER,
        entityId: id,
        beforeData,
      });
    }

    await this.invalidateAuthMetaCache(id);

    return {
      message: 'Đã xóa người dùng thành công',
      data: { deleted: true },
    };
  }

  /**
   * API-RBAC-006: Gán vai trò cho nhân viên
   */
  async assignRoles(
    id: string,
    assignRolesDto: AssignRolesDto,
    organizationId: string,
    actorUserId?: string,
    actorRoles?: string[],
  ): Promise<{ message: string }> {
    const user = await this.findUserOrFail(organizationId, id, true);
    this.assertTenantStaffTarget(user, actorRoles);

    const roles = await this.roleRepository.find({
      where: {
        id: In(assignRolesDto.roleIds),
        organizationId,
      },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều vai trò được chọn không hợp lệ hoặc không thuộc tổ chức của bạn',
      );
    }

    this.assertAssignableRoles(actorRoles, roles);

    const previousRoleIds = (user.roles ?? []).map((role) => role.id).sort();
    const nextRoleIds = roles.map((role) => role.id).sort();
    user.roles = roles;
    if (JSON.stringify(previousRoleIds) !== JSON.stringify(nextRoleIds)) {
      user.authVersion = (user.authVersion ?? 0) + 1;
    }
    await this.userRepository.save(user);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.USER_ROLES_CHANGED,
        entityType: AuditEntityType.USER,
        entityId: id,
        beforeData: { roleIds: previousRoleIds },
        afterData: { roleIds: nextRoleIds },
      });
    }

    await this.invalidateAuthMetaCache(id);

    return { message: 'Gán vai trò cho nhân viên thành công' };
  }

  private assertAssignableRoles(
    actorRoles: string[] | undefined,
    roles: Role[],
  ) {
    if (!actorRoles) return;
    if (actorRoles.includes('SUPER_ADMIN')) return;
    if (!actorRoles.includes('CEO_ADMIN')) {
      throw new ForbiddenException(
        'Bạn không được phép thay đổi vai trò người dùng',
      );
    }
    if (roles.some((role) => !['OPERATOR', 'SALES'].includes(role.code))) {
      throw new ForbiddenException(
        'CEO_ADMIN chỉ được gán vai trò OPERATOR hoặc SALES',
      );
    }
  }

  private assertTenantStaffTarget(user: User, actorRoles?: string[]) {
    if (!actorRoles || actorRoles.includes('SUPER_ADMIN')) return;
    if (!actorRoles.includes('CEO_ADMIN')) {
      throw new ForbiddenException(
        'Bạn không được phép quản lý người dùng này',
      );
    }
    const roleCodes = (user.roles ?? []).map((role) => role.code);
    if (
      roleCodes.length === 0 ||
      roleCodes.some((code) => !['OPERATOR', 'SALES'].includes(code))
    ) {
      throw new ForbiddenException(
        'CEO_ADMIN chỉ được xem và quản lý tài khoản OPERATOR hoặc SALES',
      );
    }
  }

  private auditSnapshot(user: User): Record<string, unknown> {
    return {
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? null,
      departmentId: user.departmentId ?? null,
      status: user.status,
      roleIds: (user.roles ?? []).map((role) => role.id).sort(),
    };
  }
}
