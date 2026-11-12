import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Optional,
  Logger,
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
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UserStatus } from '../../common/enums';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { derivePurposeSecret } from '../../common/utils/jwt-purpose.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional()
    private readonly redisService?: RedisService,
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

  private getNotificationPreferences(
    preferences?: Record<string, boolean>,
  ): Record<string, boolean> {
    return {
      taskAssignments: false,
      dossierUpdates: false,
      appointmentReminders: false,
      periodicReports: false,
      ...(preferences || {}),
    };
  }

  private async generateTokens(
    user: User,
    permissions: string[],
    ipAddress?: string,
    userAgent?: string,
    familyId?: string,
  ) {
    const roleCodes = user.roles?.map((r) => r.code) || [];

    const payload = {
      id: user.id,
      authVersion: user.authVersion ?? 0,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      roles: roleCodes,
      permissions,
    };

    const masterSecret = this.getJwtSecret();
    const activeFamilyId = familyId || crypto.randomUUID();
    const jti = crypto.randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        ...payload,
        familyId: activeFamilyId,
      },
      {
        secret: derivePurposeSecret(masterSecret, 'access'),
        expiresIn: '1d',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id, familyId: activeFamilyId, jti },
      {
        secret: derivePurposeSecret(masterSecret, 'refresh'),
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
      organizationId: user.organizationId,
      familyId: activeFamilyId,
      status: 'ACTIVE',
      tokenHash,
      expiresAt,
      isRevoked: false,
      ipAddress,
      userAgent,
    });
    const savedToken = await this.refreshTokenRepository.save(
      refreshTokenEntity,
    );

    return { accessToken, refreshToken, tokenRecordId: savedToken?.id };
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
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      permissions,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
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
        mustChangePassword: Boolean(user.mustChangePassword),
        roles: user.roles?.map((r) => r.code) || [],
        permissions,
      },
    };
  }

  async logout(userId: string, refreshToken?: string, familyId?: string) {
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.refreshTokenRepository.update(
        { userId, tokenHash },
        { isRevoked: true, status: 'REVOKED', revokedReason: 'LOGOUT' },
      );
    } else if (familyId) {
      await this.refreshTokenRepository.update(
        { userId, familyId, isRevoked: false },
        { isRevoked: true, status: 'REVOKED', revokedReason: 'LOGOUT' },
      );
    } else {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true, status: 'REVOKED', revokedReason: 'LOGOUT' },
      );
    }
    return { message: 'Đăng xuất thành công' };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const refreshToken = refreshTokenDto?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const masterSecret = this.getJwtSecret();

    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: derivePurposeSecret(masterSecret, 'refresh'),
      });

      // Find token in database to check if it's active or reused
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const tokenRecord = await this.refreshTokenRepository.findOne({
        where: { userId: decoded.id, tokenHash },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException(
          'Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi',
        );
      }

      if (
        tokenRecord.isRevoked ||
        tokenRecord.status === 'ROTATED' ||
        tokenRecord.status === 'REVOKED'
      ) {
        const targetFamilyId = tokenRecord.familyId || decoded.familyId;
        if (targetFamilyId) {
          await this.refreshTokenRepository.update(
            { familyId: targetFamilyId, isRevoked: false },
            {
              isRevoked: true,
              status: 'REVOKED',
              revokedReason: 'TOKEN_REUSE_DETECTED',
            },
          );
        }
        throw new UnauthorizedException(
          'Phát hiện tái sử dụng phiên đăng nhập; toàn bộ chuỗi token đã bị thu hồi',
        );
      }

      if (tokenRecord.expiresAt < new Date()) {
        tokenRecord.isRevoked = true;
        tokenRecord.status = 'REVOKED';
        tokenRecord.revokedReason = 'EXPIRED';
        await this.refreshTokenRepository.save(tokenRecord);
        throw new UnauthorizedException(
          'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
        relations: { roles: true },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
      }

      // Atomically claim the active token before minting a child token pair so
      // concurrent refreshes cannot double-mint for the same parent token.
      const claimResult = await this.refreshTokenRepository.update(
        { id: tokenRecord.id, isRevoked: false, status: 'ACTIVE' },
        { isRevoked: true, status: 'ROTATED', revokedReason: 'ROTATED' },
      );
      if (claimResult && claimResult.affected === 0) {
        throw new UnauthorizedException(
          'Phiên đăng nhập đang được làm mới hoặc đã được sử dụng',
        );
      }

      const permissions = await this.extractUserPermissions(user.roles);
      const nextTokens = await this.generateTokens(
        user,
        permissions,
        ipAddress,
        userAgent,
        tokenRecord.familyId || decoded.familyId,
      );

      // Link the rotated parent token to its replacement child token
      tokenRecord.isRevoked = true;
      tokenRecord.status = 'ROTATED';
      tokenRecord.revokedReason = 'ROTATED';
      tokenRecord.replacedByTokenId = nextTokens.tokenRecordId;
      await this.refreshTokenRepository.save(tokenRecord);

      return {
        accessToken: nextTokens.accessToken,
        refreshToken: nextTokens.refreshToken,
      };
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
      { isRevoked: true, status: 'REVOKED', revokedReason: 'REVOKED' },
    );
    await this.invalidateAuthMetaCache(userId);
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
      twoFactorEnabled: user.twoFactorEnabled,
      mustChangePassword: Boolean(user.mustChangePassword),
      notificationPreferences: this.getNotificationPreferences(
        user.notificationPreferences,
      ),
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

  async updateMyProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { organization: true, department: true, roles: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    if (updateProfileDto.fullName !== undefined) {
      const fullName = updateProfileDto.fullName.trim();
      if (fullName.length < 2) {
        throw new BadRequestException('Họ và tên phải có ít nhất 2 ký tự');
      }
      user.fullName = fullName;
    }
    if (updateProfileDto.phone !== undefined) {
      user.phone = updateProfileDto.phone.trim() || undefined;
    }
    if (updateProfileDto.avatarUrl !== undefined) {
      user.avatarUrl = updateProfileDto.avatarUrl.trim() || undefined;
    }

    await this.userRepository.save(user);
    return this.getMe(userId);
  }

  async updateMySettings(
    userId: string,
    updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    if (updateUserSettingsDto.twoFactorEnabled === true) {
      throw new BadRequestException(
        'Tính năng xác thực 2 lớp (2FA) đang được phát triển và chưa thể bật',
      );
    }

    if (updateUserSettingsDto.twoFactorEnabled === false) {
      user.twoFactorEnabled = false;
    }

    const notificationPreferences = this.getNotificationPreferences(
      user.notificationPreferences,
    );
    const preferenceKeys = [
      'taskAssignments',
      'dossierUpdates',
      'appointmentReminders',
      'periodicReports',
    ] as const;
    for (const key of preferenceKeys) {
      if (updateUserSettingsDto[key] !== undefined) {
        notificationPreferences[key] = updateUserSettingsDto[key];
      }
    }
    user.notificationPreferences = notificationPreferences;

    await this.userRepository.save(user);
    return this.getMe(userId);
  }

  async createStreamToken(user: CurrentUserPayload) {
    // Build the stream payload from the authenticated user claims instead of
    // spreading request.user, which may also contain JWT registered claims
    // such as `exp` and `iat`. `expiresIn` must be the single source of truth
    // for this short-lived token's expiration.
    const streamPayload = {
      id: user.id,
      authVersion: user.authVersion,
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
      secret: derivePurposeSecret(this.getJwtSecret(), 'stream'),
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

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu hiện tại',
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.authVersion = (user.authVersion ?? 0) + 1;
    await this.userRepository.save(user);

    // A password change invalidates every other active session, including the
    // current refresh token. The client will sign in again with the new secret.
    await this.revokeUserTokens(userId);

    return { message: 'Đổi mật khẩu thành công' };
  }

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

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }
}
