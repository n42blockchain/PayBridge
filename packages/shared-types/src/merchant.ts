/**
 * Merchant related types
 */

import type {
  MerchantType,
  MerchantStatus,
  ChainNetwork,
  FeeChargeMode,
} from './enums';

export interface MerchantDto {
  id: string;
  merchantCode: string;
  name: string;
  type: MerchantType;
  status: MerchantStatus;
  selfCustodyAddress?: string;
  settlementAddress?: string;
  settlementChain?: ChainNetwork;
  agentId?: string;
  agentName?: string;
  callbackUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantConfigDto {
  // Topup fees
  topupPercentageFee: string;
  topupFixedFee: string;
  topupMinimumFee: string;
  topupFeeChargeMode: FeeChargeMode;

  // Settlement fees
  settlementPercentageFee: string;
  settlementFixedFee: string;
  settlementMinimumFee: string;
  settlementFeeChargeMode: FeeChargeMode;

  // Refund fees
  refundPercentageFee: string;
  refundFixedFee: string;
  refundMinimumFee: string;

  // Settlement limits
  settlementMinAmount: string;
  settlementMaxAmount: string;
  settlementCycleDays: number;
  depositMinBalance: string;

  // Gateway config
  encryptionAlgorithm: string;
  apiKey: string;
  ipWhitelist: string[];
}

export interface MerchantDetailDto extends MerchantDto {
  config?: MerchantConfigDto;
  walletBalances?: {
    custody: string;
    deposit: string;
  };
}

export interface CreateMerchantRequest {
  name: string;
  type?: MerchantType;
  selfCustodyAddress?: string;
  settlementAddress?: string;
  settlementChain?: ChainNetwork;
  agentId?: string;
  callbackUrl?: string;
}

export interface UpdateMerchantRequest {
  name?: string;
  status?: MerchantStatus;
  selfCustodyAddress?: string;
  settlementAddress?: string;
  settlementChain?: ChainNetwork;
  callbackUrl?: string;
}

export interface UpdateMerchantConfigRequest {
  // Topup fees
  topupPercentageFee?: string;
  topupFixedFee?: string;
  topupMinimumFee?: string;
  topupFeeChargeMode?: FeeChargeMode;

  // Settlement fees
  settlementPercentageFee?: string;
  settlementFixedFee?: string;
  settlementMinimumFee?: string;
  settlementFeeChargeMode?: FeeChargeMode;

  // Refund fees
  refundPercentageFee?: string;
  refundFixedFee?: string;
  refundMinimumFee?: string;

  // Settlement limits
  settlementMinAmount?: string;
  settlementMaxAmount?: string;
  settlementCycleDays?: number;
  depositMinBalance?: string;

  // Gateway config
  encryptionAlgorithm?: string;
  ipWhitelist?: string[];
}

export interface MerchantListQuery {
  status?: MerchantStatus;
  type?: MerchantType;
  agentId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ResetApiSecretResponse {
  apiKey: string;
  apiSecret: string;
}
