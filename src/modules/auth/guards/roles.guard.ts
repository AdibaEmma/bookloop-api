import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    return this.hasRequiredRole(user, requiredRoles);
  }

  private hasRequiredRole(user: User, requiredRoles: string[]): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }

    return user.roles.some(
      (userRole) =>
        userRole.is_active &&
        userRole.role &&
        requiredRoles.includes(userRole.role.name),
    );
  }
}
