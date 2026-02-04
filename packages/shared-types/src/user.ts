/**
 * User related types
 */

import { UserRole, type UserStatus } from './enums';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  merchantId?: string;
  merchantName?: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  merchantId?: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

export interface UserListQuery {
  role?: UserRole;
  status?: UserStatus;
  merchantId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// 2FA
export interface Enable2FAResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface Verify2FARequest {
  code: string;
}

export interface Disable2FARequest {
  code: string;
}

// RBAC Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'merchant:*',
    'channel:*',
    'order:read',
    'order:export',
    'wallet:read',
    'user:*',
    'setting:*',
  ],
  [UserRole.OPERATOR]: [
    'merchant:read',
    'channel:read',
    'order:read',
    'order:export',
    'wallet:read',
  ],
  [UserRole.FINANCE]: [
    'merchant:read',
    'order:*',
    'wallet:*',
    'settlement:read',
  ],
  [UserRole.AUDITOR_L1]: [
    'settlement:read',
    'settlement:audit:l1',
  ],
  [UserRole.AUDITOR_L2]: [
    'settlement:read',
    'settlement:audit:l2',
  ],
  [UserRole.AUDITOR_L3]: [
    'settlement:read',
    'settlement:audit:l3',
  ],
  [UserRole.MERCHANT_ADMIN]: [
    'merchant:self:read',
    'merchant:self:config',
    'order:self:*',
    'settlement:self:*',
    'wallet:self:read',
    'user:merchant:*',
  ],
  [UserRole.MERCHANT_USER]: [
    'merchant:self:read',
    'order:self:read',
    'settlement:self:read',
    'wallet:self:read',
  ],
};
