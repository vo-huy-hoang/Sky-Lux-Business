import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission } from '../utils/permission.util';

@Injectable()
export class PermissionsGuard implements CanActivate {
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

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new UnauthorizedException('Access denied: Session not established');
    }

    // Admin roles have full access (bypass)
    const adminRoles = this.configService.get<string[]>('app.adminRoles') || [];
    const hasAdminRole =
      user.roles && user.roles.some((role) => adminRoles.includes(role));
    if (hasAdminRole) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      hasPermission(userPermissions, perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Access denied: Missing required permissions [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
