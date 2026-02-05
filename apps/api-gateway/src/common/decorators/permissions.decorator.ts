import { SetMetadata } from '@nestjs/common';

/**
 * Key used to store required permissions in metadata
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * Works with PermissionsGuard to enforce permission-based access control
 *
 * @param permissions - One or more permissions required to access the route
 *
 * @example
 * ```typescript
 * @RequirePermission('order:read')
 * async getOrders() {}
 *
 * @RequirePermission('order:write', 'order:create')
 * async createOrder() {}
 * ```
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
