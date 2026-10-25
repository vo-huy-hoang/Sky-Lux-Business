import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { UserStatus } from '../enums';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RedisService } from '../redis/redis.service';

export interface UserAuthMeta {
  id: string;
  organizationId: string;
  status: UserStatus;
  authVersion: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const currentUser = await this.getUserAuthMeta(payload.id);
      if (
        !currentUser ||
        currentUser.status !== UserStatus.ACTIVE ||
        payload.authVersion !== currentUser.authVersion ||
        payload.organizationId !== currentUser.organizationId
      ) {
        throw new UnauthorizedException('Token is no longer valid');
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
          `Redis set auth-meta error for user ${userId}: ${err?.message || err}`,
        );
      }
    }

    return meta;
  }
}
