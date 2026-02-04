/**
 * Channel related types
 */

import type {
  ChannelStatus,
  Environment,
  SettlementMode,
  ChainNetwork,
} from './enums';

// Topup Channel
export interface TopupChannelDto {
  id: string;
  code: string;
  name: string;
  environment: Environment;
  status: ChannelStatus;
  costPercentageFee: string;
  costFixedFee: string;
  costMinimumFee: string;
  orderTimeoutMinutes: number;
  priority: number;
  dailyLimit?: string;
  singleMinAmount?: string;
  singleMaxAmount?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopupChannelDetailDto extends TopupChannelDto {
  connectionConfig?: TopupChannelConnectionConfig;
}

// Dynamic connection config - varies by channel type
export interface TopupChannelConnectionConfig {
  // Common fields
  apiUrl?: string;
  merchantId?: string;
  appId?: string;
  apiKey?: string;
  apiSecret?: string;
  publicKey?: string;
  privateKey?: string;
  callbackUrl?: string;

  // Channel-specific fields stored as JSON
  [key: string]: unknown;
}

export interface CreateTopupChannelRequest {
  code: string;
  name: string;
  environment?: Environment;
  connectionConfig: TopupChannelConnectionConfig;
  costPercentageFee: string;
  costFixedFee: string;
  costMinimumFee: string;
  orderTimeoutMinutes?: number;
  priority?: number;
  dailyLimit?: string;
  singleMinAmount?: string;
  singleMaxAmount?: string;
}

export interface UpdateTopupChannelRequest {
  name?: string;
  status?: ChannelStatus;
  connectionConfig?: TopupChannelConnectionConfig;
  costPercentageFee?: string;
  costFixedFee?: string;
  costMinimumFee?: string;
  orderTimeoutMinutes?: number;
  priority?: number;
  dailyLimit?: string;
  singleMinAmount?: string;
  singleMaxAmount?: string;
}

export interface TopupChannelListQuery {
  status?: ChannelStatus;
  environment?: Environment;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Settlement Channel
export interface SettlementChannelDto {
  id: string;
  code: string;
  name: string;
  mode: SettlementMode;
  status: ChannelStatus;
  percentageFee: string;
  fixedFee: string;
  minimumFee: string;
  supportedChains: ChainNetwork[];
  createdAt: string;
  updatedAt: string;
}

export interface SettlementChannelDetailDto extends SettlementChannelDto {
  connectionConfig?: SettlementChannelConnectionConfig;
}

export interface SettlementChannelConnectionConfig {
  // For API_INTEGRATION mode
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;

  // For ONCHAIN_TRANSFER mode - uses system wallets
  [key: string]: unknown;
}

export interface CreateSettlementChannelRequest {
  code: string;
  name: string;
  mode: SettlementMode;
  connectionConfig?: SettlementChannelConnectionConfig;
  percentageFee: string;
  fixedFee: string;
  minimumFee: string;
  supportedChains: ChainNetwork[];
}

export interface UpdateSettlementChannelRequest {
  name?: string;
  status?: ChannelStatus;
  connectionConfig?: SettlementChannelConnectionConfig;
  percentageFee?: string;
  fixedFee?: string;
  minimumFee?: string;
  supportedChains?: ChainNetwork[];
}

export interface SettlementChannelListQuery {
  status?: ChannelStatus;
  mode?: SettlementMode;
  search?: string;
  page?: number;
  pageSize?: number;
}
