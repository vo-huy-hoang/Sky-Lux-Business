import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { UserStatus } from '../enums';

@Injectable()
export class JwtQueryAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
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
      const currentUser = await this.dataSource.getRepository(User).findOne({
        where: { id: payload.id },
        select: {
          id: true,
          organizationId: true,
          status: true,
          authVersion: true,
        },
      });
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
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
