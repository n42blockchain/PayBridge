import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@paybridge/shared-types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionService } from '../permissions/permission.service';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * Guard that checks if user has required permissions
 * Uses the YAML-configurable PermissionService for permission lookup
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      this.checkPermission(user, permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(' or ')}`,
      );
    }

    return true;
  }

  /**
   * Check if user has a specific permission
   * Handles "self" scope permissions for merchant users
   */
  private checkPermission(user: CurrentUserPayload, permission: string): boolean {
    const userRole = user.role as UserRole;

    // Super admin has all permissions
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check direct permission
    if (this.permissionService.hasPermission(userRole, permission)) {
      return true;
    }

    // For merchant users, check "self" scoped permissions
    // e.g., "order:read" can be satisfied by "order:self:read" for merchant's own orders
    if (user.merchantId && !permission.includes(':self:')) {
      const parts = permission.split(':');
      if (parts.length === 2) {
        const selfPermission = `${parts[0]}:self:${parts[1]}`;
        if (this.permissionService.hasPermission(userRole, selfPermission)) {
          // Note: The actual scope filtering (merchant's own resources)
          // should be done at the service layer
          return true;
        }
      }
    }

    return false;
  }
}
