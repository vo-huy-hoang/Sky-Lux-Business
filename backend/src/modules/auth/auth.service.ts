import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserStatus } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async extractUserPermissions(roles: any[]): Promise<string[]> {
    if (!roles || roles.length === 0) return [];

    const isSuperAdmin = roles.some(
      (r) => r.code === 'SUPER_ADMIN' || r.code === 'CEO_ADMIN',
    );
    if (isSuperAdmin) {
      return ['*'];
    }

    const roleIds = roles.map((r) => r.id);
    const rolePermissions = await this.rolePermissionRepository
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.permission', 'permission')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getMany();

    const permissionCodes = new Set<string>();
    rolePermissions.forEach((rp) => {
      if (rp.permission?.code) {
        permissionCodes.add(rp.permission.code);
      }
    });

    return Array.from(permissionCodes);
  }

  private async generateTokens(user: User, permissions: string[]) {
    const roleCodes = user.roles?.map((r) => r.code) || [];

    const payload = {
      id: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      roles: roleCodes,
      permissions,
    };

    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      'CHANGE_ME_LONG_RANDOM_SECRET';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret,
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id },
      {
        secret,
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: { organization: true, department: true, roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException(
        'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const permissions = await this.extractUserPermissions(user.roles);
    const tokens = await this.generateTokens(user, permissions);

    return {
      ...tokens,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
        departmentId: user.departmentId,
        departmentName: user.department?.name,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roles: user.roles?.map((r) => r.code) || [],
        permissions,
      },
    };
  }

  async logout(_userId: string) {
    return { message: 'Đăng xuất thành công' };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      'CHANGE_ME_LONG_RANDOM_SECRET';

    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret,
      });

      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
        relations: { roles: true },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
      }

      const permissions = await this.extractUserPermissions(user.roles);
      return await this.generateTokens(user, permissions);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { organization: true, department: true, roles: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    const permissions = await this.extractUserPermissions(user.roles);

    return {
      id: user.id,
      organizationId: user.organizationId,
      organization: user.organization,
      departmentId: user.departmentId,
      department: user.department,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      roles: user.roles?.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
      })) || [],
      permissions,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }
}
