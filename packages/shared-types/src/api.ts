/**
 * API response and request types
 */

// Standard API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  timestamp: number;
  requestId?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Sort
export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Common query params
export interface ListQueryParams extends Partial<PaginationParams>, Partial<SortParams> {
  search?: string;
  [key: string]: unknown;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
  requireTwoFactor?: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId?: string;
  merchantName?: string;
  twoFactorEnabled: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Gateway API types (merchant integration)
export interface GatewayHeaders {
  'X-Merchant-Id': string;
  'X-Timestamp': string;
  'X-Nonce': string;
  'X-Sign-Type': 'RSA' | 'HMAC';
  'X-Signature': string;
}

export interface CreateTopupOrderRequest {
  merchantOrderNo: string;
  fiatAmount: string;
  fiatCurrency?: string;
  depositAddress?: string;
  callbackUrl?: string;
  notifyUrl?: string;
  returnUrl?: string;
  extra?: Record<string, unknown>;
}

export interface CreateTopupOrderResponse {
  orderNo: string;
  merchantOrderNo: string;
  fiatAmount: string;
  fiatCurrency: string;
  tokenAmount: string;
  exchangeRate: string;
  fee: string;
  actualAmount: string;
  depositAddress: string;
  expireAt: string;
  cashierUrl?: string;
}

export interface QueryTopupOrderRequest {
  orderNo?: string;
  merchantOrderNo?: string;
}

export interface QueryTopupOrderResponse {
  orderNo: string;
  merchantOrderNo: string;
  status: string;
  fiatAmount: string;
  fiatCurrency: string;
  tokenAmount: string;
  fee: string;
  actualAmount: string;
  txHash?: string;
  paidAt?: string;
  createdAt: string;
}

export interface CreateRefundRequest {
  orderNo: string;
  refundAmount?: string;
  reason?: string;
}

export interface CreateRefundResponse {
  refundNo: string;
  orderNo: string;
  refundFiatAmount: string;
  refundTokenAmount: string;
  refundFee: string;
  status: string;
}

export interface QueryRefundRequest {
  refundNo?: string;
  orderNo?: string;
}

export interface QueryRefundResponse {
  refundNo: string;
  orderNo: string;
  status: string;
  refundFiatAmount: string;
  refundTokenAmount: string;
  depositDeduction: string;
  refundFee: string;
  reason?: string;
  processedAt?: string;
  createdAt: string;
}

// Callback payload types
export interface TopupCallbackPayload {
  orderNo: string;
  merchantOrderNo: string;
  status: string;
  fiatAmount: string;
  fiatCurrency: string;
  tokenAmount: string;
  fee: string;
  actualAmount: string;
  txHash?: string;
  paidAt?: string;
}

export interface RefundCallbackPayload {
  refundNo: string;
  orderNo: string;
  merchantOrderNo: string;
  status: string;
  refundFiatAmount: string;
  refundTokenAmount: string;
  depositDeduction: string;
  refundFee: string;
  processedAt?: string;
}
