import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserStatus } from '../../common/enums';

export interface UserAuthMeta {
  id: string;
  organizationId: string;
  status: UserStatus;
  authVersion: number;
  mustChangePassword?: boolean;
}

@Injectable()
export class AuthSessionStore {
  private readonly logger = new Logger(AuthSessionStore.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  /**
   * Lấy auth metadata của người dùng từ Redis cache với TTL 300s (5 phút)
   * và tự động fallback về Database nếu cache miss hoặc Redis offline/gặp sự cố.
   */
  async getAuthMeta(userId: string): Promise<UserAuthMeta | null> {
    const cacheKey = `user:auth-meta:${userId}`;

    if (this.redisService) {
      try {
        const cached = await this.redisService.get<UserAuthMeta>(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached;
        }
      } catch (err: any) {
        this.logger.warn(
          `Redis get auth-meta fallback for user ${userId}: ${err?.message || err}`,
        );
      }
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        authVersion: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return null;
    }

    const meta: UserAuthMeta = {
      id: user.id,
      organizationId: user.organizationId,
      status: user.status,
      authVersion: user.authVersion,
      mustChangePassword: Boolean(user.mustChangePassword),
    };

    if (this.redisService) {
      try {
        await this.redisService.set(cacheKey, meta, 300);
      } catch (err: any) {
        this.logger.warn(
          `Redis set auth-meta error for user ${userId}: ${err?.message || err}`,
        );
      }
    }

    return meta;
  }

  /**
   * Hủy bỏ cache auth-meta trong Redis của một hoặc nhiều người dùng (0ms invalidation).
   */
  async invalidateCache(userIds: string | string[]): Promise<void> {
    const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
    if (ids.length === 0 || !this.redisService) return;

    try {
      await Promise.all(
        ids.map((id) => this.redisService!.del(`user:auth-meta:${id}`)),
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to invalidate auth-meta cache for users [${ids.join(', ')}]: ${err?.message || err}`,
      );
    }
  }

  /**
   * Tăng auth_version trong CSDL để vô hiệu hóa ngay lập tức các token hiện hành
   * và xóa cache Redis tương ứng. Hỗ trợ chạy trong Transaction EntityManager nếu có.
   */
  async bumpAuthVersionAndInvalidate(
    userIds: string | string[],
    manager?: EntityManager,
  ): Promise<void> {
    const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
    if (ids.length === 0) return;

    const runner = manager ?? this.dataSource;
    await runner.query(
      `UPDATE "users" SET "auth_version" = "auth_version" + 1
       WHERE "id" = ANY($1::uuid[])`,
      [ids],
    );

    await this.invalidateCache(ids);
  }

  /**
   * Tăng auth_version và xóa cache cho toàn bộ người dùng mang vai trò cụ thể.
   */
  async bumpAuthVersionForRole(
    roleId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource;
    await runner.query(
      `UPDATE "users" SET "auth_version" = "auth_version" + 1
       WHERE "id" IN (SELECT "user_id" FROM "user_roles" WHERE "role_id" = $1)`,
      [roleId],
    );

    const userRows: { user_id: string }[] = await this.dataSource.query(
      `SELECT "user_id" FROM "user_roles" WHERE "role_id" = $1`,
      [roleId],
    );
    const userIds = (userRows || []).map((r) => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      await this.invalidateCache(userIds);
    }
  }

  /**
   * Thu hồi toàn bộ session người dùng (thu hồi refresh tokens, tăng auth_version, xóa cache).
   */
  async revokeSessions(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource;
    await runner.getRepository(RefreshToken).update(
      { userId, isRevoked: false },
      { isRevoked: true, status: 'REVOKED', revokedReason: 'REVOKED' },
    );

    await this.bumpAuthVersionAndInvalidate(userId, manager);
  }
}
