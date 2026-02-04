/**
 * Order related types
 */

import type {
  TopupOrderStatus,
  TopupOrderType,
  PaymentStatus,
  RefundStatus,
  SettlementOrderStatus,
  AuditResult,
  FeeChargeMode,
  ChainNetwork,
} from './enums';

// Topup Order
export interface TopupOrderDto {
  id: string;
  orderNo: string;
  merchantOrderNo: string;
  merchantId: string;
  merchantName?: string;
  orderType: TopupOrderType;
  status: TopupOrderStatus;

  fiatAmount: string;
  fiatCurrency: string;
  exchangeRate: string;
  tokenAmount: string;
  fee: string;
  actualAmount: string;

  feeChargeMode: FeeChargeMode;
  depositAddress: string;
  txHash?: string;

  expireAt: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopupOrderDetailDto extends TopupOrderDto {
  paymentTransactions?: PaymentTransactionDto[];
  refundOrders?: RefundOrderDto[];
  onchainTransactions?: OnchainTransactionDto[];
}

export interface TopupOrderListQuery {
  status?: TopupOrderStatus;
  orderType?: TopupOrderType;
  merchantId?: string;
  orderNo?: string;
  merchantOrderNo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Payment Transaction
export interface PaymentTransactionDto {
  id: string;
  transactionNo: string;
  topupOrderId: string;
  channelId: string;
  channelName?: string;
  channelTransactionNo?: string;
  amount: string;
  status: PaymentStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Refund Order
export interface RefundOrderDto {
  id: string;
  refundNo: string;
  topupOrderId: string;
  orderNo?: string;
  merchantOrderNo?: string;
  paymentTransactionId: string;
  status: RefundStatus;

  refundFiatAmount: string;
  refundTokenAmount: string;
  depositDeduction: string;
  refundFee: string;
  reason?: string;
  channelRefundNo?: string;

  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundOrderListQuery {
  status?: RefundStatus;
  merchantId?: string;
  topupOrderId?: string;
  refundNo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Settlement Order
export interface SettlementOrderDto {
  id: string;
  settlementNo: string;
  merchantId: string;
  merchantName?: string;
  status: SettlementOrderStatus;

  tokenAmount: string;
  fee: string;
  exchangeRate: string;
  usdtAmount: string;

  receivingAddress: string;
  receivingChain: ChainNetwork;
  channelId?: string;
  channelName?: string;
  txHash?: string;

  expectedProcessAt?: string;
  processedAt?: string;
  currentAuditLevel: number;

  createdAt: string;
  updatedAt: string;
}

export interface SettlementOrderDetailDto extends SettlementOrderDto {
  audits?: SettlementAuditDto[];
  onchainTransactions?: OnchainTransactionDto[];
}

export interface SettlementOrderListQuery {
  status?: SettlementOrderStatus;
  merchantId?: string;
  settlementNo?: string;
  startDate?: string;
  endDate?: string;
  pendingMyAudit?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateSettlementOrderRequest {
  tokenAmount: string;
  receivingAddress?: string;
  receivingChain?: ChainNetwork;
}

export interface AuditSettlementRequest {
  result: AuditResult;
  comment?: string;
  selectedChannelId?: string;
}

// Settlement Audit
export interface SettlementAuditDto {
  id: string;
  settlementOrderId: string;
  auditLevel: number;
  auditorId: string;
  auditorName?: string;
  result: AuditResult;
  comment?: string;
  selectedChannelId?: string;
  selectedChannelName?: string;
  auditedAt: string;
}

// Onchain Transaction
export interface OnchainTransactionDto {
  id: string;
  txHash: string;
  chain: ChainNetwork;
  blockNumber: string;
  blockTimestamp: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenType: string;
  tokenAddress?: string;
  status: string;
  confirmations: number;
  direction: string;
  gasUsed?: string;
  gasPrice?: string;
  createdAt: string;
}

export interface OnchainTransactionListQuery {
  chain?: ChainNetwork;
  walletId?: string;
  merchantId?: string;
  topupOrderId?: string;
  settlementOrderId?: string;
  txHash?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
