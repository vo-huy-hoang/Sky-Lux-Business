import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { UserStatus } from '../enums';
import { RedisService } from '../redis/redis.service';
import { UserAuthMeta } from './jwt-auth.guard';

@Injectable()
export class JwtQueryAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtQueryAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.query?.token;

    if (!token) {
      throw new UnauthorizedException('Missing token query parameter');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      const payload = await this.jwtService.verifyAsync(token, { secret });
      if (payload.stream !== true) {
        throw new UnauthorizedException('Stream token không hợp lệ');
      }
      const currentUser = await this.getUserAuthMeta(payload.id);
      if (
        !currentUser ||
        currentUser.status !== UserStatus.ACTIVE ||
        payload.authVersion !== currentUser.authVersion ||
        payload.organizationId !== currentUser.organizationId
      ) {
        throw new UnauthorizedException('Stream token không còn hợp lệ');
      }
      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  private async getUserAuthMeta(userId: string): Promise<UserAuthMeta | null> {
    const cacheKey = `user:auth-meta:${userId}`;

    if (this.redisService) {
      try {
        const cached = await this.redisService.get<UserAuthMeta>(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached;
        }
      } catch (err: any) {
        this.logger.warn(
          `Redis get auth-meta fallback for stream user ${userId}: ${err?.message || err}`,
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
    };

    if (this.redisService) {
      try {
        await this.redisService.set(cacheKey, meta, 300);
      } catch (err: any) {
        this.logger.warn(
          `Redis set auth-meta error for stream user ${userId}: ${err?.message || err}`,
        );
      }
    }

    return meta;
  }
}
