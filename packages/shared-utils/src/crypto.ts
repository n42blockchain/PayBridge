/**
 * Cryptographic utilities for sensitive data encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHmac,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Encrypt data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt
 * @param masterKey - Master encryption key (base64 encoded, 32 bytes)
 * @param associatedData - Additional authenticated data (optional)
 * @returns Encrypted data as base64 string (iv:authTag:ciphertext)
 */
export function encrypt(
  plaintext: string,
  masterKey: string,
  associatedData?: string,
): string {
  const key = Buffer.from(masterKey, 'base64');
  if (key.length !== 32) {
    throw new Error('Master key must be 32 bytes (256 bits)');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  if (associatedData) {
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  }

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: iv + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param ciphertext - Encrypted data (base64 string)
 * @param masterKey - Master encryption key (base64 encoded, 32 bytes)
 * @param associatedData - Additional authenticated data (must match encryption)
 * @returns Decrypted plaintext
 */
export function decrypt(
  ciphertext: string,
  masterKey: string,
  associatedData?: string,
): string {
  const key = Buffer.from(masterKey, 'base64');
  if (key.length !== 32) {
    throw new Error('Master key must be 32 bytes (256 bits)');
  }

  const combined = Buffer.from(ciphertext, 'base64');

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  }

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Derive a key from master key and context using HKDF
 *
 * @param masterKey - Master key (base64)
 * @param context - Context string for key derivation (e.g., wallet address)
 * @returns Derived key as base64 string
 */
export function deriveKey(masterKey: string, context: string): string {
  const key = Buffer.from(masterKey, 'base64');
  const salt = createHmac('sha256', key).update(context).digest();

  // Use scrypt for key derivation
  const derived = scryptSync(key, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
  });

  return derived.toString('base64');
}

/**
 * Generate a random encryption key
 *
 * @returns Base64 encoded 32-byte key
 */
export function generateKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Hash password using scrypt
 *
 * @param password - Plain password
 * @returns Hashed password with salt (format: salt:hash)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify password against hash
 *
 * @param password - Plain password to verify
 * @param hashedPassword - Stored hash (format: salt:hash)
 * @returns true if password matches
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [saltHex, hashHex] = hashedPassword.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(hashHex, 'hex');

  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  // Timing-safe comparison
  if (hash.length !== storedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash[i] ^ storedHash[i];
  }

  return result === 0;
}

/**
 * Encrypt sensitive config (like channel connection config)
 *
 * @param config - Configuration object
 * @param masterKey - Master encryption key
 * @returns Encrypted config string
 */
export function encryptConfig(config: Record<string, unknown>, masterKey: string): string {
  const json = JSON.stringify(config);
  return encrypt(json, masterKey);
}

/**
 * Decrypt sensitive config
 *
 * @param encryptedConfig - Encrypted config string
 * @param masterKey - Master encryption key
 * @returns Decrypted configuration object
 */
export function decryptConfig<T = Record<string, unknown>>(
  encryptedConfig: string,
  masterKey: string,
): T {
  const json = decrypt(encryptedConfig, masterKey);
  return JSON.parse(json) as T;
}
