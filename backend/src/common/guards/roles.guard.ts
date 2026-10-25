import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new UnauthorizedException('Access denied: Session not established');
    }
    if (!user.roles) {
      throw new ForbiddenException('Access denied: No role assigned');
    }

    // 1. SUPER_ADMIN has platform-wide universal bypass across all endpoints
    if (user.roles.includes('SUPER_ADMIN')) {
      return true;
    }

    // 2. CEO_ADMIN has organization-level bypass over operational roles,
    // but CANNOT bypass when the endpoint explicitly requires SUPER_ADMIN
    const isSuperAdminRequired = requiredRoles.includes('SUPER_ADMIN');
    if (user.roles.includes('CEO_ADMIN') && !isSuperAdminRequired) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required one of roles [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
