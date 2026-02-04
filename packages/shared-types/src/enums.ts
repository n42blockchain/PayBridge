/**
 * Enums for PayBridge system
 * These mirror the Prisma schema enums for use in frontend and shared code
 */

export enum MerchantType {
  NORMAL = 'NORMAL',
  AGENT = 'AGENT',
}

export enum MerchantStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  FROZEN = 'FROZEN',
}

export enum ChainNetwork {
  ETHEREUM = 'ETHEREUM',
  BSC = 'BSC',
  POLYGON = 'POLYGON',
  ARBITRUM = 'ARBITRUM',
  PAYBRIDGE = 'PAYBRIDGE',
}

export enum FeeChargeMode {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum Environment {
  TEST = 'TEST',
  PRODUCTION = 'PRODUCTION',
}

export enum ChannelStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum TopupOrderType {
  API = 'API',
  MERCHANT_PORTAL = 'MERCHANT_PORTAL',
}

export enum TopupOrderStatus {
  PENDING = 'PENDING',
  PAYING = 'PAYING',
  PAID = 'PAID',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CLOSED = 'CLOSED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum SettlementMode {
  API_INTEGRATION = 'API_INTEGRATION',
  ONCHAIN_TRANSFER = 'ONCHAIN_TRANSFER',
}

export enum SettlementOrderStatus {
  PENDING = 'PENDING',
  PENDING_AUDIT = 'PENDING_AUDIT',
  AUDITING = 'AUDITING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SETTLING = 'SETTLING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum AuditResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum WalletType {
  FUND_POOL = 'FUND_POOL',
  GAS = 'GAS',
  CUSTODY = 'CUSTODY',
  DEPOSIT = 'DEPOSIT',
}

export enum TokenType {
  NATIVE = 'NATIVE',
  ERC20 = 'ERC20',
}

export enum OnchainTxStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum TransactionDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum CallbackType {
  TOPUP = 'TOPUP',
  REFUND = 'REFUND',
}

export enum CallbackStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  FINANCE = 'FINANCE',
  AUDITOR_L1 = 'AUDITOR_L1',
  AUDITOR_L2 = 'AUDITOR_L2',
  AUDITOR_L3 = 'AUDITOR_L3',
  MERCHANT_ADMIN = 'MERCHANT_ADMIN',
  MERCHANT_USER = 'MERCHANT_USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}
