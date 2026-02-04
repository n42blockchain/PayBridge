/**
 * System settings types
 */

export interface SystemSettingDto {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingRequest {
  value: unknown;
}

// Predefined setting keys
export const SETTING_KEYS = {
  // Security
  FORCE_2FA: 'security.force_2fa',

  // Exchange rates
  TOPUP_EXCHANGE_RATE: 'topup.exchange_rate',
  SETTLEMENT_EXCHANGE_RATE: 'settlement.exchange_rate',

  // Topup defaults
  TOPUP_DEFAULT_TIMEOUT_MINUTES: 'topup.default_timeout_minutes',

  // Settlement audit levels
  SETTLEMENT_AUDIT_LEVELS: 'settlement.audit_levels',

  // Blockchain
  REQUIRED_CONFIRMATIONS: 'blockchain.required_confirmations',
  GAS_THRESHOLD: 'blockchain.gas_threshold',
  GAS_SUPPLEMENT_AMOUNT: 'blockchain.gas_supplement_amount',

  // Callback
  CALLBACK_MAX_RETRIES: 'callback.max_retries',
} as const;

// Audit level configuration
export interface AuditLevelConfig {
  level: number;
  minAmount: string;
  roles: string[];
}

// Settings value types
export interface SettingsValues {
  [SETTING_KEYS.FORCE_2FA]: boolean;
  [SETTING_KEYS.TOPUP_EXCHANGE_RATE]: number;
  [SETTING_KEYS.SETTLEMENT_EXCHANGE_RATE]: number;
  [SETTING_KEYS.TOPUP_DEFAULT_TIMEOUT_MINUTES]: number;
  [SETTING_KEYS.SETTLEMENT_AUDIT_LEVELS]: AuditLevelConfig[];
  [SETTING_KEYS.REQUIRED_CONFIRMATIONS]: number;
  [SETTING_KEYS.GAS_THRESHOLD]: number;
  [SETTING_KEYS.GAS_SUPPLEMENT_AMOUNT]: number;
  [SETTING_KEYS.CALLBACK_MAX_RETRIES]: number;
}
