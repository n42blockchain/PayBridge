/**
 * Wallet related types
 */

import type { WalletType, ChainNetwork } from './enums';

export interface WalletDto {
  id: string;
  type: WalletType;
  chain: ChainNetwork;
  address: string;
  merchantId?: string;
  merchantName?: string;
  label?: string;
  balance: string;
  nativeBalance: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletListQuery {
  type?: WalletType;
  chain?: ChainNetwork;
  merchantId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateWalletRequest {
  type: WalletType;
  chain: ChainNetwork;
  merchantId?: string;
  label?: string;
}

export interface CreateWalletResponse {
  id: string;
  address: string;
  type: WalletType;
  chain: ChainNetwork;
}

export interface WalletBalanceSummary {
  fundPool: {
    balance: string;
    nativeBalance: string;
    address: string;
  };
  gas: {
    balance: string;
    nativeBalance: string;
    address: string;
  };
}

export interface MerchantWalletSummary {
  custody: {
    balance: string;
    address: string;
  };
  deposit: {
    balance: string;
    address: string;
  };
}

export interface GasSupplementRequest {
  walletId: string;
  amount: string;
}

export interface TransferRequest {
  fromWalletId: string;
  toAddress: string;
  amount: string;
  tokenType?: 'NATIVE' | 'ERC20';
}
