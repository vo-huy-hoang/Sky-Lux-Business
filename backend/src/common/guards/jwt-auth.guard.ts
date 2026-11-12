import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
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
import {
  ACCESS_TOKEN_COOKIE,
  parseCookieHeader,
} from '../utils/cookie.util';
import { derivePurposeSecret } from '../utils/jwt-purpose.util';

export interface UserAuthMeta {
  id: string;
  organizationId: string;
  status: UserStatus;
  authVersion: number;
  mustChangePassword?: boolean;
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
    const cookies = parseCookieHeader(request.headers?.['cookie']);
    const cookieToken = cookies[ACCESS_TOKEN_COOKIE];
    const authHeader = request.headers?.['authorization'];

    let token: string | undefined;
    if (cookieToken) {
      token = cookieToken;
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    }

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: derivePurposeSecret(secret, 'access'),
      });
      const currentUser = await this.getUserAuthMeta(payload.id);
      if (
        !currentUser ||
        currentUser.status !== UserStatus.ACTIVE ||
        payload.authVersion !== currentUser.authVersion ||
        payload.organizationId !== currentUser.organizationId
      ) {
        throw new UnauthorizedException('Token is no longer valid');
      }
      if (
        currentUser.mustChangePassword &&
        !this.isAllowedDuringPasswordRotation(request)
      ) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'PASSWORD_CHANGE_REQUIRED',
          message:
            'Bạn phải đổi mật khẩu lần đầu trước khi sử dụng hệ thống',
        });
      }
      request.user = payload;
      return true;
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  private isAllowedDuringPasswordRotation(request: {
    method?: string;
    originalUrl?: string;
    url?: string;
  }): boolean {
    const method = (request.method || 'GET').toUpperCase();
    const rawUrl = request.originalUrl || request.url || '';
    const pathname = rawUrl.split('?')[0].replace(/\/+$/, '') || '/';

    if (method === 'GET' && (pathname === '/api/auth/me' || pathname === '/auth/me')) {
      return true;
    }
    if (
      method === 'POST' &&
      (pathname === '/api/auth/change-password' ||
        pathname === '/auth/change-password' ||
        pathname === '/api/auth/logout' ||
        pathname === '/auth/logout')
    ) {
      return true;
    }
    return false;
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
}
