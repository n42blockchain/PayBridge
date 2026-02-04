import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UserInfo,
} from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const authApi = {
  login: (data: LoginRequest) =>
    getHttpClient().post<LoginResponse>('/api/v1/auth/login', data),

  refreshToken: (refreshToken: string) =>
    getHttpClient().post<RefreshTokenResponse>('/api/v1/auth/refresh', {
      refreshToken,
    }),

  logout: (refreshToken: string) =>
    getHttpClient().post('/api/v1/auth/logout', { refreshToken }),

  changePassword: (currentPassword: string, newPassword: string) =>
    getHttpClient().post('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    }),

  setup2FA: () =>
    getHttpClient().post<{ secret: string; qrCodeUrl: string }>(
      '/api/v1/auth/2fa/setup',
    ),

  enable2FA: (code: string) =>
    getHttpClient().post('/api/v1/auth/2fa/enable', { code }),

  disable2FA: (code: string) =>
    getHttpClient().post('/api/v1/auth/2fa/disable', { code }),
};
