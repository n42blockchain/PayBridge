import type {
  MerchantDto,
  MerchantDetailDto,
  MerchantConfigDto,
  CreateMerchantRequest,
  UpdateMerchantRequest,
  UpdateMerchantConfigRequest,
  MerchantListQuery,
  ResetApiSecretResponse,
  PaginatedResponse,
} from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const merchantApi = {
  list: (query?: MerchantListQuery) =>
    getHttpClient().get<PaginatedResponse<MerchantDto>>(
      '/api/v1/merchants',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<MerchantDetailDto>(`/api/v1/merchants/${id}`),

  getMe: () => getHttpClient().get<MerchantDetailDto>('/api/v1/merchants/me'),

  create: (data: CreateMerchantRequest) =>
    getHttpClient().post<MerchantDetailDto>('/api/v1/merchants', data),

  update: (id: string, data: UpdateMerchantRequest) =>
    getHttpClient().put<MerchantDto>(`/api/v1/merchants/${id}`, data),

  updateConfig: (id: string, data: UpdateMerchantConfigRequest) =>
    getHttpClient().put<MerchantConfigDto>(
      `/api/v1/merchants/${id}/config`,
      data,
    ),

  resetApiSecret: (id: string) =>
    getHttpClient().post<ResetApiSecretResponse>(
      `/api/v1/merchants/${id}/reset-api-secret`,
    ),

  enable: (id: string) =>
    getHttpClient().post(`/api/v1/merchants/${id}/enable`),

  disable: (id: string) =>
    getHttpClient().post(`/api/v1/merchants/${id}/disable`),

  freeze: (id: string) =>
    getHttpClient().post(`/api/v1/merchants/${id}/freeze`),
};
