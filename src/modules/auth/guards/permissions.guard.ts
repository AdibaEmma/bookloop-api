import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    return this.hasRequiredPermissions(user, requiredPermissions);
  }

  private hasRequiredPermissions(
    user: User,
    requiredPermissions: string[],
  ): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }

    const userPermissions = new Set<string>();

    user.roles.forEach((userRole) => {
      if (
        userRole.is_active &&
        userRole.role &&
        userRole.role.permissions
      ) {
        userRole.role.permissions.forEach((permission) => {
          userPermissions.add(permission.name);
        });
      }
    });

    return requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );
  }
}
