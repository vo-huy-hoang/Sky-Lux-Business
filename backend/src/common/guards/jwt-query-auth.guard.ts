import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Optional,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { UserStatus } from '../enums';
import { RedisService } from '../redis/redis.service';
import {
  AuthSessionStore,
  UserAuthMeta,
} from '../../modules/auth/auth-session.store';
import {
  ACCESS_TOKEN_COOKIE,
  parseCookieHeader,
} from '../utils/cookie.util';
import { derivePurposeSecret } from '../utils/jwt-purpose.util';

export type { UserAuthMeta };

@Injectable()
export class JwtQueryAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtQueryAuthGuard.name);
  private authSessionStore: AuthSessionStore;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly redisService?: RedisService,
    @Optional()
    authSessionStore?: AuthSessionStore,
  ) {
    this.authSessionStore =
      authSessionStore ??
      new AuthSessionStore(this.dataSource, this.redisService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const queryToken =
      typeof request.query?.token === 'string'
        ? request.query.token
        : undefined;
    const cookies = parseCookieHeader(request.headers?.['cookie']);
    const cookieToken = cookies[ACCESS_TOKEN_COOKIE];

    if (!queryToken && !cookieToken) {
      throw new UnauthorizedException('Missing token query parameter');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      let payload: any;
      if (queryToken) {
        payload = await this.jwtService.verifyAsync(queryToken, {
          secret: derivePurposeSecret(secret, 'stream'),
        });
        if (payload.stream !== true) {
          throw new UnauthorizedException('Stream token không hợp lệ');
        }
      } else {
        payload = await this.jwtService.verifyAsync(cookieToken, {
          secret: derivePurposeSecret(secret, 'access'),
        });
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
      if (currentUser.mustChangePassword) {
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

  private async getUserAuthMeta(userId: string): Promise<UserAuthMeta | null> {
    return this.authSessionStore.getAuthMeta(userId);
  }
}
