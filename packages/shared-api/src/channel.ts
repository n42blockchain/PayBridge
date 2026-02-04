import type {
  TopupChannelDto,
  TopupChannelDetailDto,
  TopupChannelListQuery,
  CreateTopupChannelRequest,
  UpdateTopupChannelRequest,
  SettlementChannelDto,
  SettlementChannelDetailDto,
  SettlementChannelListQuery,
  CreateSettlementChannelRequest,
  UpdateSettlementChannelRequest,
  PaginatedResponse,
} from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const topupChannelApi = {
  list: (query?: TopupChannelListQuery) =>
    getHttpClient().get<PaginatedResponse<TopupChannelDto>>(
      '/api/v1/topup-channels',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<TopupChannelDetailDto>(`/api/v1/topup-channels/${id}`),

  create: (data: CreateTopupChannelRequest) =>
    getHttpClient().post<TopupChannelDto>('/api/v1/topup-channels', data),

  update: (id: string, data: UpdateTopupChannelRequest) =>
    getHttpClient().put<TopupChannelDto>(`/api/v1/topup-channels/${id}`, data),
};

export const settlementChannelApi = {
  list: (query?: SettlementChannelListQuery) =>
    getHttpClient().get<PaginatedResponse<SettlementChannelDto>>(
      '/api/v1/settlement-channels',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<SettlementChannelDetailDto>(
      `/api/v1/settlement-channels/${id}`,
    ),

  create: (data: CreateSettlementChannelRequest) =>
    getHttpClient().post<SettlementChannelDto>(
      '/api/v1/settlement-channels',
      data,
    ),

  update: (id: string, data: UpdateSettlementChannelRequest) =>
    getHttpClient().put<SettlementChannelDto>(
      `/api/v1/settlement-channels/${id}`,
      data,
    ),
};
