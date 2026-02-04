import type {
  UserDto,
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  PaginatedResponse,
} from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const userApi = {
  list: (query?: UserListQuery) =>
    getHttpClient().get<PaginatedResponse<UserDto>>(
      '/api/v1/users',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<UserDto>(`/api/v1/users/${id}`),

  create: (data: CreateUserRequest) =>
    getHttpClient().post<UserDto>('/api/v1/users', data),

  update: (id: string, data: UpdateUserRequest) =>
    getHttpClient().put<UserDto>(`/api/v1/users/${id}`, data),

  resetPassword: (id: string, newPassword: string) =>
    getHttpClient().post(`/api/v1/users/${id}/reset-password`, { newPassword }),

  delete: (id: string) => getHttpClient().delete(`/api/v1/users/${id}`),
};
