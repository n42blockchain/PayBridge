import { describe, it, expect } from 'vitest';
import { FeeCalculator, Decimal } from './fee-calculator';

describe('FeeCalculator', () => {
  describe('calculate', () => {
    it('should calculate fee correctly with percentage and fixed fee', () => {
      const result = FeeCalculator.calculate('1000', {
        percentageFee: '0.025', // 2.5%
        fixedFee: '1',
        minimumFee: '0',
      });

      expect(result.calculatedFee.toString()).toBe('26');
      expect(result.actualAmount.toString()).toBe('974');
      expect(result.isMinimumApplied).toBe(false);
    });

    it('should apply minimum fee when raw fee is lower', () => {
      const result = FeeCalculator.calculate('10', {
        percentageFee: '0.01', // 1%
        fixedFee: '0',
        minimumFee: '5',
      });

      // Raw fee = 10 * 0.01 = 0.1, which is less than minimum 5
      expect(result.calculatedFee.toString()).toBe('5');
      expect(result.isMinimumApplied).toBe(true);
      expect(result.rawFee.toString()).toBe('0.1');
    });

    it('should not apply minimum fee when raw fee is higher', () => {
      const result = FeeCalculator.calculate('1000', {
        percentageFee: '0.025',
        fixedFee: '1',
        minimumFee: '5',
      });

      // Raw fee = 1000 * 0.025 + 1 = 26, which is greater than minimum 5
      expect(result.calculatedFee.toString()).toBe('26');
      expect(result.isMinimumApplied).toBe(false);
    });

    it('should handle zero amount', () => {
      const result = FeeCalculator.calculate('0', {
        percentageFee: '0.025',
        fixedFee: '1',
        minimumFee: '5',
      });

      // Raw fee = 0 * 0.025 + 1 = 1, minimum is 5
      expect(result.calculatedFee.toString()).toBe('5');
      expect(result.isMinimumApplied).toBe(true);
    });

    it('should handle Decimal input', () => {
      const result = FeeCalculator.calculate(new Decimal('100'), {
        percentageFee: new Decimal('0.01'),
        fixedFee: new Decimal('0.5'),
        minimumFee: new Decimal('0'),
      });

      expect(result.calculatedFee.toString()).toBe('1.5');
    });

    it('should handle number input', () => {
      const result = FeeCalculator.calculate(100, {
        percentageFee: 0.01,
        fixedFee: 0.5,
        minimumFee: 0,
      });

      expect(result.calculatedFee.toString()).toBe('1.5');
    });

    it('should handle high precision decimals', () => {
      const result = FeeCalculator.calculate('1234.56789', {
        percentageFee: '0.025678',
        fixedFee: '0.12345678',
        minimumFee: '0',
      });

      // Should maintain precision
      const expected = new Decimal('1234.56789')
        .mul('0.025678')
        .add('0.12345678');
      expect(result.calculatedFee.toString()).toBe(expected.toString());
    });
  });

  describe('calculateInternalFee', () => {
    it('should return correct fee and actual amount', () => {
      const { fee, actualAmount } = FeeCalculator.calculateInternalFee('1000', {
        percentageFee: '0.02',
        fixedFee: '1',
        minimumFee: '5',
      });

      // Fee = 1000 * 0.02 + 1 = 21
      expect(fee.toString()).toBe('21');
      expect(actualAmount.toString()).toBe('979');
    });
  });

  describe('calculateExternalFee', () => {
    it('should return correct fee and total amount', () => {
      const { fee, totalAmount } = FeeCalculator.calculateExternalFee('1000', {
        percentageFee: '0.02',
        fixedFee: '1',
        minimumFee: '5',
      });

      // Fee = 1000 * 0.02 + 1 = 21
      expect(fee.toString()).toBe('21');
      expect(totalAmount.toString()).toBe('1021');
    });
  });

  describe('calculateEffectiveRate', () => {
    it('should calculate effective rate as percentage', () => {
      const rate = FeeCalculator.calculateEffectiveRate('1000', {
        percentageFee: '0.025',
        fixedFee: '0',
        minimumFee: '0',
      });

      expect(rate.toString()).toBe('2.5');
    });

    it('should account for fixed fee in effective rate', () => {
      const rate = FeeCalculator.calculateEffectiveRate('100', {
        percentageFee: '0.01', // 1%
        fixedFee: '1', // +1
        minimumFee: '0',
      });

      // Fee = 1 + 1 = 2, effective rate = 2/100 * 100 = 2%
      expect(rate.toString()).toBe('2');
    });

    it('should return 0 for zero amount', () => {
      const rate = FeeCalculator.calculateEffectiveRate('0', {
        percentageFee: '0.025',
        fixedFee: '1',
        minimumFee: '5',
      });

      expect(rate.toString()).toBe('0');
    });
  });

  describe('formatFeeConfig', () => {
    it('should format percentage only', () => {
      const formatted = FeeCalculator.formatFeeConfig({
        percentageFee: '0.025',
        fixedFee: '0',
        minimumFee: '0',
      });

      expect(formatted).toBe('2.5%');
    });

    it('should format percentage and fixed fee', () => {
      const formatted = FeeCalculator.formatFeeConfig({
        percentageFee: '0.025',
        fixedFee: '1',
        minimumFee: '0',
      });

      expect(formatted).toBe('2.5% +1');
    });

    it('should format with minimum fee', () => {
      const formatted = FeeCalculator.formatFeeConfig({
        percentageFee: '0.025',
        fixedFee: '1',
        minimumFee: '5',
      });

      expect(formatted).toBe('2.5% +1 (min: 5)');
    });

    it('should handle zero fees', () => {
      const formatted = FeeCalculator.formatFeeConfig({
        percentageFee: '0',
        fixedFee: '0',
        minimumFee: '0',
      });

      expect(formatted).toBe('0');
    });

    it('should format fixed fee only', () => {
      const formatted = FeeCalculator.formatFeeConfig({
        percentageFee: '0',
        fixedFee: '10',
        minimumFee: '0',
      });

      expect(formatted).toBe('+10');
    });
  });
});
