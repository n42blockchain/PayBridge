/**
 * Domain events for event-driven architecture
 */

/**
 * All domain event types
 */
export enum DomainEvent {
  // Topup order events
  TOPUP_ORDER_CREATED = 'topup.order.created',
  TOPUP_ORDER_PAYING = 'topup.order.paying',
  TOPUP_ORDER_PAID = 'topup.order.paid',
  TOPUP_ORDER_SUCCESS = 'topup.order.success',
  TOPUP_ORDER_FAILED = 'topup.order.failed',
  TOPUP_ORDER_CLOSED = 'topup.order.closed',
  TOPUP_ORDER_EXPIRED = 'topup.order.expired',

  // Payment transaction events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',

  // Refund events
  REFUND_CREATED = 'refund.created',
  REFUND_PROCESSING = 'refund.processing',
  REFUND_SUCCESS = 'refund.success',
  REFUND_FAILED = 'refund.failed',
  REFUND_REJECTED = 'refund.rejected',

  // Settlement events
  SETTLEMENT_CREATED = 'settlement.created',
  SETTLEMENT_PENDING_AUDIT = 'settlement.pending_audit',
  SETTLEMENT_AUDIT_L1 = 'settlement.audit.l1',
  SETTLEMENT_AUDIT_L2 = 'settlement.audit.l2',
  SETTLEMENT_AUDIT_L3 = 'settlement.audit.l3',
  SETTLEMENT_APPROVED = 'settlement.approved',
  SETTLEMENT_REJECTED = 'settlement.rejected',
  SETTLEMENT_SETTLING = 'settlement.settling',
  SETTLEMENT_SUCCESS = 'settlement.success',
  SETTLEMENT_FAILED = 'settlement.failed',

  // Blockchain events
  ONCHAIN_TX_CREATED = 'onchain.tx.created',
  ONCHAIN_TX_PENDING = 'onchain.tx.pending',
  ONCHAIN_TX_CONFIRMED = 'onchain.tx.confirmed',
  ONCHAIN_TX_FAILED = 'onchain.tx.failed',

  // Wallet events
  WALLET_CREATED = 'wallet.created',
  WALLET_BALANCE_UPDATED = 'wallet.balance.updated',
  WALLET_BALANCE_LOW = 'wallet.balance.low',
  GAS_BALANCE_LOW = 'gas.balance.low',

  // Callback events
  CALLBACK_CREATED = 'callback.created',
  CALLBACK_SUCCESS = 'callback.success',
  CALLBACK_FAILED = 'callback.failed',
  CALLBACK_ABANDONED = 'callback.abandoned',

  // Merchant events
  MERCHANT_CREATED = 'merchant.created',
  MERCHANT_UPDATED = 'merchant.updated',
  MERCHANT_STATUS_CHANGED = 'merchant.status.changed',

  // System events
  SYSTEM_SETTING_UPDATED = 'system.setting.updated',
  SYSTEM_ALERT = 'system.alert',
  AUDIT_LOG_CREATED = 'audit.log.created',
}

/**
 * Base event payload interface
 */
export interface DomainEventPayload<T = unknown> {
  /** Event type */
  eventType: DomainEvent;
  /** Aggregate ID (e.g., orderId, merchantId) */
  aggregateId: string;
  /** Aggregate type (e.g., 'TopupOrder', 'Merchant') */
  aggregateType: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data: T;
  /** Optional metadata */
  metadata?: {
    /** Correlation ID for tracing */
    correlationId?: string;
    /** Causation ID (ID of event that caused this event) */
    causationId?: string;
    /** User ID who triggered the event */
    userId?: string;
    /** IP address */
    ip?: string;
    /** Additional context */
    [key: string]: unknown;
  };
}

// Specific event data types

export interface TopupOrderCreatedData {
  orderNo: string;
  merchantId: string;
  merchantOrderNo: string;
  fiatAmount: string;
  tokenAmount: string;
  fee: string;
  depositAddress: string;
  expireAt: string;
}

export interface TopupOrderStatusChangedData {
  orderNo: string;
  merchantId: string;
  previousStatus: string;
  newStatus: string;
  txHash?: string;
}

export interface RefundCreatedData {
  refundNo: string;
  originalOrderNo: string;
  merchantId: string;
  refundFiatAmount: string;
  refundTokenAmount: string;
  reason?: string;
}

export interface RefundStatusChangedData {
  refundNo: string;
  merchantId: string;
  previousStatus: string;
  newStatus: string;
  channelRefundNo?: string;
}

export interface SettlementCreatedData {
  settlementNo: string;
  merchantId: string;
  tokenAmount: string;
  fee: string;
  usdtAmount: string;
  receivingAddress: string;
  receivingChain: string;
}

export interface SettlementAuditData {
  settlementNo: string;
  auditLevel: number;
  auditorId: string;
  result: 'APPROVED' | 'REJECTED';
  comment?: string;
  selectedChannelId?: string;
}

export interface WalletBalanceData {
  walletId: string;
  walletType: string;
  chain: string;
  address: string;
  previousBalance: string;
  newBalance: string;
  merchantId?: string;
}

export interface CallbackData {
  callbackId: string;
  merchantId: string;
  callbackType: string;
  callbackUrl: string;
  status: string;
  retryCount: number;
}

export interface OnchainTxData {
  txHash: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenType: string;
  status: string;
  confirmations: number;
  relatedOrderId?: string;
}
