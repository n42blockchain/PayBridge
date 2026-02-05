import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, ROLE_PERMISSIONS } from '@paybridge/shared-types';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface RoleConfig {
  description?: string;
  permissions: string[];
}

interface PermissionsConfig {
  roles: Record<string, RoleConfig>;
}

@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);
  private rolePermissions: Map<UserRole, string[]> = new Map();
  private configFilePath: string;

  constructor(private configService: ConfigService) {
    this.configFilePath = this.configService.get<string>(
      'PERMISSIONS_CONFIG_PATH',
      path.join(process.cwd(), 'config', 'permissions.yaml'),
    );
  }

  onModuleInit() {
    this.loadPermissions();
  }

  /**
   * Load permissions from YAML config file
   * Falls back to hardcoded permissions if file not found or invalid
   */
  private loadPermissions() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const fileContents = fs.readFileSync(this.configFilePath, 'utf8');
        const config = yaml.load(fileContents) as PermissionsConfig;

        if (this.validateConfig(config)) {
          this.applyConfig(config);
          this.logger.log(`Permissions loaded from ${this.configFilePath}`);
          return;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load permissions config: ${error}`);
    }

    // Fallback to hardcoded permissions
    this.loadDefaultPermissions();
    this.logger.log('Using default hardcoded permissions');
  }

  /**
   * Validate the YAML config structure
   */
  private validateConfig(config: unknown): config is PermissionsConfig {
    if (!config || typeof config !== 'object') {
      this.logger.warn('Invalid config: not an object');
      return false;
    }

    const c = config as Record<string, unknown>;
    if (!c.roles || typeof c.roles !== 'object') {
      this.logger.warn('Invalid config: missing or invalid roles');
      return false;
    }

    const roles = c.roles as Record<string, unknown>;
    for (const [roleName, roleConfig] of Object.entries(roles)) {
      if (!Object.values(UserRole).includes(roleName as UserRole)) {
        this.logger.warn(`Unknown role in config: ${roleName}`);
        // Don't fail, just skip unknown roles
        continue;
      }

      if (!roleConfig || typeof roleConfig !== 'object') {
        this.logger.warn(`Invalid config for role ${roleName}`);
        return false;
      }

      const rc = roleConfig as Record<string, unknown>;
      if (!Array.isArray(rc.permissions)) {
        this.logger.warn(`Invalid permissions for role ${roleName}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply validated config to the permission map
   */
  private applyConfig(config: PermissionsConfig) {
    this.rolePermissions.clear();

    for (const [roleName, roleConfig] of Object.entries(config.roles)) {
      const role = roleName as UserRole;
      if (Object.values(UserRole).includes(role)) {
        this.rolePermissions.set(role, roleConfig.permissions);
      }
    }
  }

  /**
   * Load default hardcoded permissions
   */
  private loadDefaultPermissions() {
    this.rolePermissions.clear();
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      this.rolePermissions.set(role as UserRole, permissions);
    }
  }

  /**
   * Reload permissions from config file
   * Can be called at runtime to update permissions without restart
   */
  reloadPermissions() {
    this.loadPermissions();
  }

  /**
   * Get permissions for a specific role
   */
  getPermissions(role: UserRole): string[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: UserRole, permission: string): boolean {
    const permissions = this.getPermissions(role);

    // Check for wildcard (full access)
    if (permissions.includes('*')) {
      return true;
    }

    // Check exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Check wildcard patterns
    // e.g., "order:*" matches "order:read", "order:write", etc.
    const permissionParts = permission.split(':');
    for (const p of permissions) {
      if (this.matchWildcard(p, permissionParts)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match permission with wildcard support
   */
  private matchWildcard(pattern: string, permissionParts: string[]): boolean {
    const patternParts = pattern.split(':');

    if (patternParts.length > permissionParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') {
        // Wildcard matches remaining parts
        return true;
      }
      if (patternParts[i] !== permissionParts[i]) {
        return false;
      }
    }

    // Pattern consumed, check if all parts matched
    return patternParts.length === permissionParts.length;
  }

  /**
   * Get all configured role permissions
   */
  getAllPermissions(): Record<UserRole, string[]> {
    const result: Partial<Record<UserRole, string[]>> = {};
    for (const [role, permissions] of this.rolePermissions) {
      result[role] = permissions;
    }
    return result as Record<UserRole, string[]>;
  }
}
