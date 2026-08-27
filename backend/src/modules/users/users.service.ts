import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

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

  /**
   * API-USERS-002: Lấy chi tiết thông tin người dùng theo ID
   */
  async findOne(organizationId: string, id: string) {
    const user = await this.findUserOrFail(organizationId, id, true);

    return {
      data: this.sanitizeUser(user),
    };
  }

  /**
   * API-USERS-003: Tạo người dùng mới
   */
  async create(organizationId: string, createUserDto: CreateUserDto) {
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
        where: { employeeCode: finalEmployeeCode },
      });
      if (existingCode) {
        throw new ConflictException(
          `Mã nhân viên "${finalEmployeeCode}" đã tồn tại`,
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

    return {
      data: this.sanitizeUser(savedUser),
    };
  }

  /**
   * API-USERS-004: Cập nhật thông tin người dùng
   */
  async update(
    organizationId: string,
    id: string,
    updateUserDto: UpdateUserDto,
  ) {
    const user = await this.findUserOrFail(organizationId, id, true);

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
          where: { employeeCode: trimmedCode },
        });
        if (existingCode) {
          throw new ConflictException(
            `Mã nhân viên "${trimmedCode}" đã tồn tại`,
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
        user.roles = roles;
      } else {
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

    const updatedUser = await this.userRepository.save(user);

    return {
      data: this.sanitizeUser(updatedUser),
    };
  }

  /**
   * API-USERS-005: Khóa tài khoản người dùng và thu hồi mọi phiên đăng nhập
   */
  async lockUser(organizationId: string, id: string) {
    const user = await this.findUserOrFail(organizationId, id, true);

    user.status = UserStatus.LOCKED;
    const savedUser = await this.userRepository.save(user);

    // Thu hồi toàn bộ refresh token để hủy mọi phiên làm việc ngay lập tức
    await this.refreshTokenRepository.update(
      { userId: id, isRevoked: false },
      { isRevoked: true },
    );

    return {
      message: 'Đã khóa tài khoản và thu hồi tất cả phiên đăng nhập thành công',
      data: this.sanitizeUser(savedUser),
    };
  }

  /**
   * API-USERS-006: Mở khóa tài khoản người dùng
   */
  async unlockUser(organizationId: string, id: string) {
    const user = await this.findUserOrFail(organizationId, id, true);

    user.status = UserStatus.ACTIVE;
    const savedUser = await this.userRepository.save(user);

    return {
      message: 'Đã mở khóa tài khoản thành công',
      data: this.sanitizeUser(savedUser),
    };
  }

  /**
   * API-USERS-007: Xóa người dùng (Soft delete)
   */
  async remove(organizationId: string, id: string) {
    const user = await this.findUserOrFail(organizationId, id, false);

    // Thu hồi toàn bộ phiên đăng nhập trước khi xóa
    await this.refreshTokenRepository.update(
      { userId: id, isRevoked: false },
      { isRevoked: true },
    );

    await this.userRepository.softRemove(user);

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
  ): Promise<{ message: string }> {
    const user = await this.findUserOrFail(organizationId, id, true);

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

    user.roles = roles;
    await this.userRepository.save(user);

    return { message: 'Gán vai trò cho nhân viên thành công' };
  }
}
