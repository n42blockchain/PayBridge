/**
 * Signature utilities for Gateway API
 */

import { createHmac, createHash, createSign, createVerify, KeyObject } from 'crypto';

/**
 * Signature parameters
 */
export interface SignatureParams {
  merchantId: string;
  timestamp: number;
  nonce: string;
  body?: Record<string, unknown>;
}

/**
 * Build signature string from parameters
 * Sorts parameters by key in ASCII order
 *
 * @param params - Parameters to sign
 * @returns Signature string
 */
export function buildSignatureString(params: SignatureParams): string {
  const allParams: Record<string, string> = {
    merchantId: params.merchantId,
    timestamp: params.timestamp.toString(),
    nonce: params.nonce,
  };

  // Flatten body parameters
  if (params.body) {
    flattenObject(params.body, allParams);
  }

  // Sort by key ASCII order and build string
  const sortedKeys = Object.keys(allParams).sort();
  const pairs = sortedKeys.map((key) => `${key}=${allParams[key]}`);

  return pairs.join('&');
}

/**
 * Flatten nested object for signature
 *
 * @param obj - Object to flatten
 * @param result - Result object
 * @param prefix - Key prefix for nested objects
 */
function flattenObject(
  obj: Record<string, unknown>,
  result: Record<string, string>,
  prefix: string = '',
): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, result, fullKey);
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = String(value);
    }
  }
}

/**
 * Sign string using HMAC-SHA256
 *
 * @param content - Content to sign
 * @param secret - Secret key
 * @returns Base64 encoded signature
 */
export function signHmac(content: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(content);
  return hmac.digest('base64');
}

/**
 * Verify HMAC-SHA256 signature
 *
 * @param content - Original content
 * @param signature - Signature to verify
 * @param secret - Secret key
 * @returns true if signature is valid
 */
export function verifyHmac(content: string, signature: string, secret: string): boolean {
  const expectedSignature = signHmac(content, secret);
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Sign string using RSA-SHA256
 *
 * @param content - Content to sign
 * @param privateKey - RSA private key (PEM format)
 * @returns Base64 encoded signature
 */
export function signRsa(content: string, privateKey: string | KeyObject): string {
  const sign = createSign('RSA-SHA256');
  sign.update(content);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

/**
 * Verify RSA-SHA256 signature
 *
 * @param content - Original content
 * @param signature - Signature to verify (base64)
 * @param publicKey - RSA public key (PEM format)
 * @returns true if signature is valid
 */
export function verifyRsa(
  content: string,
  signature: string,
  publicKey: string | KeyObject,
): boolean {
  try {
    const verify = createVerify('RSA-SHA256');
    verify.update(content);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * Generate random nonce
 *
 * @param length - Length of nonce (default: 32)
 * @returns Random hex string
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Check if timestamp is within valid range (±5 minutes)
 *
 * @param timestamp - Timestamp to check (milliseconds)
 * @param maxDiffMs - Maximum allowed difference (default: 5 minutes)
 * @returns true if timestamp is valid
 */
export function isTimestampValid(timestamp: number, maxDiffMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= maxDiffMs;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * MD5 hash (for compatibility with some payment channels)
 *
 * @param content - Content to hash
 * @returns Hex encoded MD5 hash
 */
export function md5(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * SHA256 hash
 *
 * @param content - Content to hash
 * @returns Hex encoded SHA256 hash
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
