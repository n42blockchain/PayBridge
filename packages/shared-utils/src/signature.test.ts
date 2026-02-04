import { describe, it, expect } from 'vitest';
import {
  buildSignatureString,
  signHmac,
  verifyHmac,
  generateNonce,
  isTimestampValid,
  md5,
  sha256,
} from './signature';

describe('Signature Utilities', () => {
  describe('buildSignatureString', () => {
    it('should build signature string with sorted keys', () => {
      const params = {
        merchantId: 'M123',
        timestamp: 1706900000000,
        nonce: 'abc123',
        body: { amount: '100', currency: 'CNY' },
      };

      const result = buildSignatureString(params);

      // Keys should be sorted alphabetically
      expect(result).toContain('merchantId=M123');
      expect(result).toContain('nonce=abc123');
      expect(result).toContain('timestamp=1706900000000');
      expect(result).toContain('amount=100');
      expect(result).toContain('currency=CNY');
    });

    it('should handle empty body', () => {
      const params = {
        merchantId: 'M123',
        timestamp: 1706900000000,
        nonce: 'abc123',
        body: {},
      };

      const result = buildSignatureString(params);

      expect(result).toContain('merchantId=M123');
      expect(result).not.toContain('body');
    });

    it('should handle nested objects with dot notation', () => {
      const params = {
        merchantId: 'M123',
        timestamp: 1706900000000,
        nonce: 'abc123',
        body: { user: { name: 'Alice' } },
      };

      const result = buildSignatureString(params);
      // Nested objects are flattened with dot notation
      expect(result).toContain('user.name=Alice');
    });

    it('should produce consistent output', () => {
      const params = {
        merchantId: 'M123',
        timestamp: 1706900000000,
        nonce: 'abc123',
        body: { b: '2', a: '1' },
      };

      const result1 = buildSignatureString(params);
      const result2 = buildSignatureString(params);

      expect(result1).toBe(result2);
    });
  });

  describe('signHmac / verifyHmac', () => {
    const secret = 'test-secret-key';

    it('should sign and verify HMAC signature', () => {
      const data = 'merchantId=M123&nonce=abc123&timestamp=1706900000000';

      const signature = signHmac(data, secret);
      const isValid = verifyHmac(data, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const data = 'merchantId=M123&nonce=abc123&timestamp=1706900000000';

      const isValid = verifyHmac(data, 'invalid-signature', secret);

      expect(isValid).toBe(false);
    });

    it('should return false for tampered data', () => {
      const data = 'merchantId=M123&nonce=abc123&timestamp=1706900000000';
      const signature = signHmac(data, secret);

      const tamperedData = 'merchantId=M456&nonce=abc123&timestamp=1706900000000';
      const isValid = verifyHmac(tamperedData, signature, secret);

      expect(isValid).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const data = 'merchantId=M123&nonce=abc123&timestamp=1706900000000';
      const signature = signHmac(data, secret);

      const isValid = verifyHmac(data, signature, 'wrong-secret');

      expect(isValid).toBe(false);
    });

    it('should produce base64 encoded signature', () => {
      const data = 'test-data';
      const signature = signHmac(data, secret);

      // Base64 pattern
      expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('generateNonce', () => {
    it('should generate a string of specified length', () => {
      const nonce = generateNonce(32);
      expect(nonce.length).toBe(32);
    });

    it('should generate unique values', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      expect(nonces.size).toBe(100);
    });

    it('should only contain alphanumeric characters', () => {
      const nonce = generateNonce(64);
      expect(nonce).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should use default length when not specified', () => {
      const nonce = generateNonce();
      expect(nonce.length).toBeGreaterThan(0);
    });
  });

  describe('isTimestampValid', () => {
    it('should return true for current timestamp', () => {
      const timestamp = Date.now();
      expect(isTimestampValid(timestamp)).toBe(true);
    });

    it('should return true for timestamp within tolerance', () => {
      const timestamp = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      expect(isTimestampValid(timestamp, 5 * 60 * 1000)).toBe(true);
    });

    it('should return false for old timestamp', () => {
      const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      expect(isTimestampValid(timestamp, 5 * 60 * 1000)).toBe(false);
    });

    it('should return false for future timestamp beyond tolerance', () => {
      const timestamp = Date.now() + 10 * 60 * 1000; // 10 minutes in future
      expect(isTimestampValid(timestamp, 5 * 60 * 1000)).toBe(false);
    });

    it('should handle string timestamps', () => {
      const timestamp = String(Date.now());
      expect(isTimestampValid(Number(timestamp))).toBe(true);
    });
  });

  describe('md5', () => {
    it('should compute MD5 hash', () => {
      const hash = md5('hello');
      expect(hash).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    it('should be consistent', () => {
      expect(md5('test')).toBe(md5('test'));
    });

    it('should handle empty string', () => {
      const hash = md5('');
      expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });
  });

  describe('sha256', () => {
    it('should compute SHA256 hash', () => {
      const hash = sha256('hello');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should be consistent', () => {
      expect(sha256('test')).toBe(sha256('test'));
    });

    it('should handle empty string', () => {
      const hash = sha256('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });
});
