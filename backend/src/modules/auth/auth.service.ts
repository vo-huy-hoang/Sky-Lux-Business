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
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserStatus } from '../../common/enums';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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

  private async generateTokens(
    user: User,
    permissions: string[],
    ipAddress?: string,
    userAgent?: string,
  ) {
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

    const secret = this.getJwtSecret();

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

    // Hash the refresh token and save it to the database
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      isRevoked: false,
      ipAddress,
      userAgent,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
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
    const tokens = await this.generateTokens(
      user,
      permissions,
      ipAddress,
      userAgent,
    );

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

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.refreshTokenRepository.update(
        { userId, tokenHash },
        { isRevoked: true },
      );
    } else {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }
    return { message: 'Đăng xuất thành công' };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { refreshToken } = refreshTokenDto;
    const secret = this.getJwtSecret();

    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret,
      });

      // Find token in database to check if it's revoked
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const tokenRecord = await this.refreshTokenRepository.findOne({
        where: { userId: decoded.id, tokenHash },
      });

      if (
        !tokenRecord ||
        tokenRecord.isRevoked ||
        tokenRecord.expiresAt < new Date()
      ) {
        throw new UnauthorizedException(
          'Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
        relations: { roles: true },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
      }

      // Revoke the old token (rotation)
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepository.save(tokenRecord);

      const permissions = await this.extractUserPermissions(user.roles);
      // Generate new tokens
      return await this.generateTokens(user, permissions, ipAddress, userAgent);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async revokeUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
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
      roles:
        user.roles?.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
        })) || [],
      permissions,
    };
  }

  async createStreamToken(user: CurrentUserPayload) {
    // Build the stream payload from the authenticated user claims instead of
    // spreading request.user, which may also contain JWT registered claims
    // such as `exp` and `iat`. `expiresIn` must be the single source of truth
    // for this short-lived token's expiration.
    const streamPayload = {
      id: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      stream: true,
    };

    const token = await this.jwtService.signAsync(streamPayload, {
      secret: this.getJwtSecret(),
      expiresIn: '60s',
    });
    return { token };
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

    // A password change invalidates every other active session, including the
    // current refresh token. The client will sign in again with the new secret.
    await this.revokeUserTokens(userId);

    return { message: 'Đổi mật khẩu thành công' };
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }
}
