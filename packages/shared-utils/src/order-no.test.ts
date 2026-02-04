import { describe, it, expect } from 'vitest';
import {
  ORDER_PREFIXES,
  generateOrderNo,
  generateMerchantCode,
  generateApiKey,
  generateApiSecret,
  parseOrderNo,
} from './order-no';

describe('Order Number Utilities', () => {
  describe('ORDER_PREFIXES', () => {
    it('should have all required prefixes', () => {
      expect(ORDER_PREFIXES.TOPUP).toBe('TP');
      expect(ORDER_PREFIXES.REFUND).toBe('RF');
      expect(ORDER_PREFIXES.SETTLEMENT).toBe('ST');
      expect(ORDER_PREFIXES.PAYMENT).toBe('PT');
    });
  });

  describe('generateOrderNo', () => {
    it('should generate order number with correct prefix', () => {
      const orderNo = generateOrderNo(ORDER_PREFIXES.TOPUP);
      expect(orderNo.startsWith('TP')).toBe(true);
    });

    it('should generate unique order numbers', () => {
      const orderNos = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        orderNos.add(generateOrderNo(ORDER_PREFIXES.TOPUP));
      }
      expect(orderNos.size).toBe(1000);
    });

    it('should generate order number with correct length', () => {
      const orderNo = generateOrderNo(ORDER_PREFIXES.TOPUP);
      // Typically: prefix(2) + timestamp(14) + random(6) = 22 chars
      expect(orderNo.length).toBeGreaterThanOrEqual(20);
      expect(orderNo.length).toBeLessThanOrEqual(32);
    });

    it('should work with all prefixes', () => {
      Object.values(ORDER_PREFIXES).forEach((prefix) => {
        const orderNo = generateOrderNo(prefix);
        expect(orderNo.startsWith(prefix)).toBe(true);
      });
    });

    it('should be sortable by time (lexicographic order)', () => {
      const orderNo1 = generateOrderNo(ORDER_PREFIXES.TOPUP);

      // Wait a tiny bit to ensure different timestamp
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      return wait(10).then(() => {
        const orderNo2 = generateOrderNo(ORDER_PREFIXES.TOPUP);
        expect(orderNo1 < orderNo2).toBe(true);
      });
    });
  });

  describe('generateMerchantCode', () => {
    it('should generate merchant code with M prefix', () => {
      const code = generateMerchantCode();
      expect(code.startsWith('M')).toBe(true);
    });

    it('should generate 12-character merchant code', () => {
      const code = generateMerchantCode();
      expect(code.length).toBe(12);
    });

    it('should generate unique merchant codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateMerchantCode());
      }
      expect(codes.size).toBe(1000);
    });

    it('should only contain alphanumeric characters', () => {
      const code = generateMerchantCode();
      expect(code).toMatch(/^M[A-Z0-9]+$/);
    });
  });

  describe('generateApiKey', () => {
    it('should generate 32-character API key', () => {
      const key = generateApiKey();
      expect(key.length).toBe(32);
    });

    it('should generate unique API keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100);
    });

    it('should generate alphanumeric characters', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateApiSecret', () => {
    it('should generate 64-character API secret', () => {
      const secret = generateApiSecret();
      expect(secret.length).toBe(64);
    });

    it('should generate unique API secrets', () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 100; i++) {
        secrets.add(generateApiSecret());
      }
      expect(secrets.size).toBe(100);
    });

    it('should generate alphanumeric and special characters', () => {
      const secret = generateApiSecret();
      // Contains alphanumeric and special characters !@#$%^&*
      expect(secret).toMatch(/^[a-zA-Z0-9!@#$%^&*]+$/);
    });
  });

  describe('parseOrderNo', () => {
    it('should parse topup order number', () => {
      const orderNo = generateOrderNo(ORDER_PREFIXES.TOPUP);
      const result = parseOrderNo(orderNo);

      expect(result).not.toBeNull();
      expect(result!.prefix).toBe('TP');
      expect(result!.date).toBeInstanceOf(Date);
      expect(typeof result!.sequence).toBe('number');
    });

    it('should parse refund order number', () => {
      const orderNo = generateOrderNo(ORDER_PREFIXES.REFUND);
      const result = parseOrderNo(orderNo);

      expect(result).not.toBeNull();
      expect(result!.prefix).toBe('RF');
    });

    it('should parse settlement order number', () => {
      const orderNo = generateOrderNo(ORDER_PREFIXES.SETTLEMENT);
      const result = parseOrderNo(orderNo);

      expect(result).not.toBeNull();
      expect(result!.prefix).toBe('ST');
    });

    it('should parse payment order number', () => {
      const orderNo = generateOrderNo(ORDER_PREFIXES.PAYMENT);
      const result = parseOrderNo(orderNo);

      expect(result).not.toBeNull();
      expect(result!.prefix).toBe('PT');
    });

    it('should extract approximate timestamp', () => {
      const before = new Date();
      const orderNo = generateOrderNo(ORDER_PREFIXES.TOPUP);
      const after = new Date();

      const result = parseOrderNo(orderNo);

      expect(result).not.toBeNull();
      expect(result!.date.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(result!.date.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should return null for invalid order number', () => {
      const result = parseOrderNo('INVALID123');
      expect(result).toBeNull();
    });

    it('should return null for order with invalid prefix', () => {
      const result = parseOrderNo('XX20240203143025123001');
      expect(result).toBeNull();
    });
  });
});
