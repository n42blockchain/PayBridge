import { describe, it, expect } from 'vitest';
import {
  isValidAddress,
  isValidTxHash,
  normalizeAddress,
  addressesEqual,
  truncateAddress,
  getExplorerUrl,
  parseUnits,
  formatUnits,
} from './chain';

describe('Chain validation utilities', () => {
  describe('isValidAddress', () => {
    it('should return true for valid addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(true);
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('0x')).toBe(false);
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44')).toBe(false); // Too short
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44ee')).toBe(false); // Too long
      expect(isValidAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false); // No 0x prefix
      expect(isValidAddress('0xZZZd35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false); // Invalid hex
    });

    it('should handle null and undefined', () => {
      expect(isValidAddress(null as unknown as string)).toBe(false);
      expect(isValidAddress(undefined as unknown as string)).toBe(false);
    });
  });

  describe('isValidTxHash', () => {
    it('should return true for valid tx hashes', () => {
      expect(
        isValidTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
      ).toBe(true);
    });

    it('should return false for invalid tx hashes', () => {
      expect(isValidTxHash('')).toBe(false);
      expect(isValidTxHash('0x123')).toBe(false); // Too short
      expect(isValidTxHash('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false); // Address length
    });
  });

  describe('normalizeAddress', () => {
    it('should lowercase valid addresses', () => {
      expect(normalizeAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(
        '0x742d35cc6634c0532925a3b844bc454e4438f44e',
      );
    });

    it('should return null for invalid addresses', () => {
      expect(normalizeAddress('invalid')).toBe(null);
    });
  });

  describe('addressesEqual', () => {
    it('should return true for equal addresses (case insensitive)', () => {
      expect(
        addressesEqual(
          '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          '0x742d35cc6634c0532925a3b844bc454e4438f44e',
        ),
      ).toBe(true);
    });

    it('should return false for different addresses', () => {
      expect(
        addressesEqual(
          '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          '0x0000000000000000000000000000000000000000',
        ),
      ).toBe(false);
    });

    it('should return false for invalid addresses', () => {
      expect(addressesEqual('invalid', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
    });
  });

  describe('truncateAddress', () => {
    it('should truncate address with default lengths', () => {
      expect(truncateAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe('0x742d...f44e');
    });

    it('should truncate with custom lengths', () => {
      expect(truncateAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 6, 6)).toBe(
        '0x742d35...38f44e',
      );
    });

    it('should return original if too short', () => {
      expect(truncateAddress('0x1234')).toBe('0x1234');
    });
  });

  describe('getExplorerUrl', () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should return correct URL for Ethereum', () => {
      expect(getExplorerUrl('ETHEREUM', 'address', address)).toBe(
        `https://etherscan.io/address/${address}`,
      );
      expect(getExplorerUrl('ETHEREUM', 'tx', txHash)).toBe(`https://etherscan.io/tx/${txHash}`);
    });

    it('should return correct URL for BSC', () => {
      expect(getExplorerUrl('BSC', 'address', address)).toBe(
        `https://bscscan.com/address/${address}`,
      );
    });

    it('should return null for unsupported chains', () => {
      expect(getExplorerUrl('UNKNOWN_CHAIN', 'address', address)).toBe(null);
    });
  });

  describe('parseUnits', () => {
    it('should parse integer amounts', () => {
      expect(parseUnits('1', 18)).toBe(BigInt('1000000000000000000'));
      expect(parseUnits('100', 18)).toBe(BigInt('100000000000000000000'));
    });

    it('should parse decimal amounts', () => {
      expect(parseUnits('1.5', 18)).toBe(BigInt('1500000000000000000'));
      expect(parseUnits('0.1', 18)).toBe(BigInt('100000000000000000'));
    });

    it('should handle different decimals', () => {
      expect(parseUnits('1', 6)).toBe(BigInt('1000000'));
      expect(parseUnits('1.5', 6)).toBe(BigInt('1500000'));
    });

    it('should truncate excess decimal places', () => {
      expect(parseUnits('1.123456789012345678901234', 18)).toBe(BigInt('1123456789012345678'));
    });
  });

  describe('formatUnits', () => {
    it('should format to human readable', () => {
      expect(formatUnits(BigInt('1000000000000000000'), 18)).toBe('1');
      expect(formatUnits(BigInt('1500000000000000000'), 18)).toBe('1.5');
      expect(formatUnits(BigInt('100000000000000000'), 18)).toBe('0.1');
    });

    it('should handle different decimals', () => {
      expect(formatUnits(BigInt('1000000'), 6)).toBe('1');
      expect(formatUnits(BigInt('1500000'), 6)).toBe('1.5');
    });

    it('should remove trailing zeros', () => {
      expect(formatUnits(BigInt('1100000000000000000'), 18)).toBe('1.1');
    });

    it('should handle string input', () => {
      expect(formatUnits('1000000000000000000', 18)).toBe('1');
    });

    it('should handle zero', () => {
      expect(formatUnits(BigInt('0'), 18)).toBe('0');
    });
  });
});
