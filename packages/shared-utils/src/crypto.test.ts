import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  encryptConfig,
  decryptConfig,
  generateKey,
} from './crypto';

describe('Crypto Utilities', () => {
  // Use a 32-byte base64 encoded key for testing
  const testKey = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt text successfully', () => {
      const plaintext = 'Hello, World!';

      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Hello, World!';

      const encrypted1 = encrypt(plaintext, testKey);
      const encrypted2 = encrypt(plaintext, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', () => {
      const plaintext = '';

      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍';

      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);

      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on decryption with wrong key', () => {
      const plaintext = 'Hello, World!';
      const wrongKey = Buffer.from('fedcba9876543210fedcba9876543210').toString('base64');

      const encrypted = encrypt(plaintext, testKey);

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should throw on corrupted ciphertext', () => {
      const encrypted = 'corrupted-data-that-is-not-valid';

      expect(() => decrypt(encrypted, testKey)).toThrow();
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('should hash and verify password successfully', async () => {
      const password = 'MySecurePassword123!';

      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should produce different hashes for same password (random salt)', async () => {
      const password = 'MySecurePassword123!';

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should return false for wrong password', async () => {
      const password = 'MySecurePassword123!';

      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';

      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle unicode password', async () => {
      const password = '密码123!🔐';

      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should be timing-safe against timing attacks', async () => {
      const password = 'TestPassword';
      const hash = await hashPassword(password);

      // Measure timing for correct password
      const correctTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await verifyPassword(password, hash);
        correctTimes.push(performance.now() - start);
      }

      // Measure timing for wrong password
      const wrongTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await verifyPassword('WrongPassword', hash);
        wrongTimes.push(performance.now() - start);
      }

      // Timings should be relatively similar (within order of magnitude)
      const avgCorrect = correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length;
      const avgWrong = wrongTimes.reduce((a, b) => a + b, 0) / wrongTimes.length;

      // Allow for some variance but they should be in same ballpark
      expect(Math.abs(avgCorrect - avgWrong) < 50).toBe(true);
    });
  });

  describe('encryptConfig / decryptConfig', () => {
    it('should encrypt and decrypt config object', () => {
      const config = {
        apiKey: 'sk-test-123',
        apiSecret: 'very-secret-value',
        endpoint: 'https://api.example.com',
      };

      const encrypted = encryptConfig(config, testKey);
      const decrypted = decryptConfig(encrypted, testKey);

      expect(decrypted).toEqual(config);
    });

    it('should handle nested objects', () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret123',
          },
        },
      };

      const encrypted = encryptConfig(config, testKey);
      const decrypted = decryptConfig(encrypted, testKey);

      expect(decrypted).toEqual(config);
    });

    it('should handle arrays', () => {
      const config = {
        allowedIPs: ['192.168.1.1', '10.0.0.1'],
        ports: [80, 443, 8080],
      };

      const encrypted = encryptConfig(config, testKey);
      const decrypted = decryptConfig(encrypted, testKey);

      expect(decrypted).toEqual(config);
    });

    it('should handle empty object', () => {
      const config = {};

      const encrypted = encryptConfig(config, testKey);
      const decrypted = decryptConfig(encrypted, testKey);

      expect(decrypted).toEqual(config);
    });
  });

  describe('generateKey', () => {
    it('should generate a key of correct length', () => {
      const key = generateKey(32);
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateKey());
      }
      expect(keys.size).toBe(100);
    });

    it('should generate base64 encoded output', () => {
      const key = generateKey();
      expect(key).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });
});
