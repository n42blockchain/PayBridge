import Decimal from 'decimal.js';

/**
 * Fee configuration for fee calculation
 */
export interface FeeConfig {
  /** Percentage fee rate (e.g., 0.025 = 2.5%) */
  percentageFee: Decimal | string | number;
  /** Fixed fee amount */
  fixedFee: Decimal | string | number;
  /** Minimum fee amount */
  minimumFee: Decimal | string | number;
}

/**
 * Fee calculation result
 */
export interface FeeCalculationResult {
  /** The calculated fee amount */
  calculatedFee: Decimal;
  /** The actual amount after fee deduction (for INTERNAL mode) */
  actualAmount: Decimal;
  /** Whether the minimum fee was applied */
  isMinimumApplied: boolean;
  /** The raw calculated fee before minimum comparison */
  rawFee: Decimal;
}

/**
 * Fee Calculator
 *
 * Formula: actualFee = max(amount × percentageFee + fixedFee, minimumFee)
 */
export class FeeCalculator {
  /**
   * Calculate fee based on amount and fee configuration
   *
   * @param amount - The base amount for fee calculation
   * @param config - Fee configuration containing percentage, fixed, and minimum fees
   * @returns Fee calculation result
   */
  static calculate(
    amount: Decimal | string | number,
    config: FeeConfig,
  ): FeeCalculationResult {
    const amountDecimal = new Decimal(amount);
    const percentageFee = new Decimal(config.percentageFee);
    const fixedFee = new Decimal(config.fixedFee);
    const minimumFee = new Decimal(config.minimumFee);

    // Calculate raw fee: amount * percentageFee + fixedFee
    const rawFee = amountDecimal.mul(percentageFee).add(fixedFee);

    // Apply minimum fee: max(rawFee, minimumFee)
    const isMinimumApplied = rawFee.lt(minimumFee);
    const calculatedFee = isMinimumApplied ? minimumFee : rawFee;

    // Calculate actual amount (for INTERNAL fee charge mode)
    const actualAmount = amountDecimal.sub(calculatedFee);

    return {
      calculatedFee,
      actualAmount,
      isMinimumApplied,
      rawFee,
    };
  }

  /**
   * Calculate fee for INTERNAL mode (fee deducted from amount)
   * Returns the actual amount the user receives
   *
   * @param amount - The total amount
   * @param config - Fee configuration
   * @returns The actual amount after fee deduction
   */
  static calculateInternalFee(
    amount: Decimal | string | number,
    config: FeeConfig,
  ): { fee: Decimal; actualAmount: Decimal } {
    const result = this.calculate(amount, config);
    return {
      fee: result.calculatedFee,
      actualAmount: result.actualAmount,
    };
  }

  /**
   * Calculate fee for EXTERNAL mode (user pays fee on top)
   * Returns the total amount user needs to pay
   *
   * @param amount - The base amount
   * @param config - Fee configuration
   * @returns The total amount including fee
   */
  static calculateExternalFee(
    amount: Decimal | string | number,
    config: FeeConfig,
  ): { fee: Decimal; totalAmount: Decimal } {
    const result = this.calculate(amount, config);
    const amountDecimal = new Decimal(amount);
    return {
      fee: result.calculatedFee,
      totalAmount: amountDecimal.add(result.calculatedFee),
    };
  }

  /**
   * Calculate the effective fee rate
   *
   * @param amount - The amount
   * @param config - Fee configuration
   * @returns The effective fee rate as a percentage (e.g., 2.5 for 2.5%)
   */
  static calculateEffectiveRate(
    amount: Decimal | string | number,
    config: FeeConfig,
  ): Decimal {
    const result = this.calculate(amount, config);
    const amountDecimal = new Decimal(amount);
    if (amountDecimal.isZero()) {
      return new Decimal(0);
    }
    return result.calculatedFee.div(amountDecimal).mul(100);
  }

  /**
   * Format fee configuration for display
   *
   * @param config - Fee configuration
   * @returns Formatted string describing the fee structure
   */
  static formatFeeConfig(config: FeeConfig): string {
    const percentageFee = new Decimal(config.percentageFee).mul(100);
    const fixedFee = new Decimal(config.fixedFee);
    const minimumFee = new Decimal(config.minimumFee);

    const parts: string[] = [];

    if (!percentageFee.isZero()) {
      parts.push(`${percentageFee.toString()}%`);
    }

    if (!fixedFee.isZero()) {
      parts.push(`+${fixedFee.toString()}`);
    }

    let result = parts.join(' ') || '0';

    if (!minimumFee.isZero()) {
      result += ` (min: ${minimumFee.toString()})`;
    }

    return result;
  }
}

export { Decimal };
