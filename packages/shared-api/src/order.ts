import type {
  TopupOrderDto,
  TopupOrderDetailDto,
  TopupOrderListQuery,
  RefundOrderDto,
  RefundOrderListQuery,
  SettlementOrderDto,
  SettlementOrderDetailDto,
  SettlementOrderListQuery,
  CreateSettlementOrderRequest,
  AuditSettlementRequest,
  PaginatedResponse,
} from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const topupOrderApi = {
  list: (query?: TopupOrderListQuery) =>
    getHttpClient().get<PaginatedResponse<TopupOrderDto>>(
      '/api/v1/topup-orders',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<TopupOrderDetailDto>(`/api/v1/topup-orders/${id}`),
};

export const refundOrderApi = {
  list: (query?: RefundOrderListQuery) =>
    getHttpClient().get<PaginatedResponse<RefundOrderDto>>(
      '/api/v1/refund-orders',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<RefundOrderDto>(`/api/v1/refund-orders/${id}`),
};

export const settlementOrderApi = {
  list: (query?: SettlementOrderListQuery) =>
    getHttpClient().get<PaginatedResponse<SettlementOrderDto>>(
      '/api/v1/settlement-orders',
      query as Record<string, unknown>,
    ),

  getById: (id: string) =>
    getHttpClient().get<SettlementOrderDetailDto>(
      `/api/v1/settlement-orders/${id}`,
    ),

  create: (data: CreateSettlementOrderRequest) =>
    getHttpClient().post<SettlementOrderDto>('/api/v1/settlement-orders', data),

  audit: (id: string, data: AuditSettlementRequest) =>
    getHttpClient().post(`/api/v1/settlement-orders/${id}/audit`, data),
};
