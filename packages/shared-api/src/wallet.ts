import type {
  WalletDto,
  WalletListQuery,
  CreateWalletRequest,
  CreateWalletResponse,
  WalletBalanceSummary,
  PaginatedResponse,
} from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const walletApi = {
  list: (query?: WalletListQuery) =>
    getHttpClient().get<PaginatedResponse<WalletDto>>(
      '/api/v1/wallets',
      query as Record<string, unknown>,
    ),

  create: (data: CreateWalletRequest) =>
    getHttpClient().post<CreateWalletResponse>('/api/v1/wallets', data),

  getSystemSummary: (chain?: string) =>
    getHttpClient().get<WalletBalanceSummary>('/api/v1/wallets/system-summary', {
      chain,
    }),
};
