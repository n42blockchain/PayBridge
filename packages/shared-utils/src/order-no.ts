/**
 * Order number generation utilities
 */

/**
 * Order number prefixes
 */
export const ORDER_PREFIXES = {
  TOPUP: 'TP',
  REFUND: 'RF',
  SETTLEMENT: 'ST',
  PAYMENT: 'PT',
} as const;

export type OrderPrefix = (typeof ORDER_PREFIXES)[keyof typeof ORDER_PREFIXES];

// Counter for sequence within the same millisecond
let lastTimestamp = 0;
let sequence = 0;

/**
 * Generate unique order number
 *
 * Format: PREFIX + YYYYMMDD + HHmmss + SSS + SEQUENCE(4)
 * Example: TP20240203143025123001
 *
 * @param prefix - Order type prefix
 * @returns Unique order number
 */
export function generateOrderNo(prefix: OrderPrefix): string {
  const now = Date.now();

  // Reset sequence if timestamp changed
  if (now !== lastTimestamp) {
    lastTimestamp = now;
    sequence = 0;
  } else {
    sequence++;
    // Handle overflow
    if (sequence > 9999) {
      sequence = 0;
    }
  }

  const date = new Date(now);
  const datePart = formatDate(date);
  const timePart = formatTime(date);
  const msPart = date.getMilliseconds().toString().padStart(3, '0');
  const seqPart = sequence.toString().padStart(4, '0');

  return `${prefix}${datePart}${timePart}${msPart}${seqPart}`;
}

/**
 * Format date as YYYYMMDD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format time as HHmmss
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

/**
 * Generate merchant code
 *
 * Format: M + 11 random alphanumeric characters
 * Example: M1A2B3C4D5E6
 *
 * @returns Merchant code
 */
export function generateMerchantCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = 'M';

  for (let i = 0; i < 11; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Generate API key
 *
 * Format: 32 character alphanumeric string
 *
 * @returns API key
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';

  for (let i = 0; i < 32; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    key += chars[randomIndex];
  }

  return key;
}

/**
 * Generate API secret
 *
 * Format: 64 character alphanumeric string with special characters
 *
 * @returns API secret
 */
export function generateApiSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let secret = '';

  for (let i = 0; i < 64; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    secret += chars[randomIndex];
  }

  return secret;
}

/**
 * Parse order number to extract information
 *
 * @param orderNo - Order number to parse
 * @returns Parsed order info or null if invalid
 */
export function parseOrderNo(orderNo: string): {
  prefix: string;
  date: Date;
  sequence: number;
} | null {
  if (!orderNo || orderNo.length < 20) {
    return null;
  }

  const prefix = orderNo.slice(0, 2);
  const datePart = orderNo.slice(2, 10);
  const timePart = orderNo.slice(10, 16);
  const msPart = orderNo.slice(16, 19);
  const seqPart = orderNo.slice(19);

  // Validate prefix
  const validPrefixes = Object.values(ORDER_PREFIXES);
  if (!validPrefixes.includes(prefix as OrderPrefix)) {
    return null;
  }

  // Parse date
  const year = parseInt(datePart.slice(0, 4), 10);
  const month = parseInt(datePart.slice(4, 6), 10) - 1;
  const day = parseInt(datePart.slice(6, 8), 10);
  const hours = parseInt(timePart.slice(0, 2), 10);
  const minutes = parseInt(timePart.slice(2, 4), 10);
  const seconds = parseInt(timePart.slice(4, 6), 10);
  const ms = parseInt(msPart, 10);

  const date = new Date(year, month, day, hours, minutes, seconds, ms);
  const sequence = parseInt(seqPart, 10);

  return {
    prefix,
    date,
    sequence,
  };
}
