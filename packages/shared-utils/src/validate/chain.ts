/**
 * Blockchain address and transaction validation utilities
 */

/**
 * Validate Ethereum-compatible address
 *
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Check basic format: 0x followed by 40 hex characters
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validate Ethereum-compatible transaction hash
 *
 * @param txHash - The transaction hash to validate
 * @returns true if valid, false otherwise
 */
export function isValidTxHash(txHash: string): boolean {
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }

  // Check basic format: 0x followed by 64 hex characters
  const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
  return txHashRegex.test(txHash);
}

/**
 * Normalize address to lowercase checksum-compatible format
 *
 * @param address - The address to normalize
 * @returns Lowercase address or null if invalid
 */
export function normalizeAddress(address: string): string | null {
  if (!isValidAddress(address)) {
    return null;
  }
  return address.toLowerCase();
}

/**
 * Compare two addresses for equality (case-insensitive)
 *
 * @param address1 - First address
 * @param address2 - Second address
 * @returns true if addresses are equal
 */
export function addressesEqual(address1: string, address2: string): boolean {
  const normalized1 = normalizeAddress(address1);
  const normalized2 = normalizeAddress(address2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

/**
 * Truncate address for display (e.g., 0x1234...5678)
 *
 * @param address - The address to truncate
 * @param prefixLength - Number of characters after 0x (default: 4)
 * @param suffixLength - Number of characters at the end (default: 4)
 * @returns Truncated address or original if too short
 */
export function truncateAddress(
  address: string,
  prefixLength: number = 4,
  suffixLength: number = 4,
): string {
  if (!address || address.length < prefixLength + suffixLength + 6) {
    return address;
  }

  const prefix = address.slice(0, 2 + prefixLength); // 0x + prefix
  const suffix = address.slice(-suffixLength);

  return `${prefix}...${suffix}`;
}

/**
 * Get blockchain explorer URL for address or transaction
 *
 * @param chain - Chain network identifier
 * @param type - 'address' or 'tx'
 * @param value - Address or transaction hash
 * @returns Explorer URL or null if chain not supported
 */
export function getExplorerUrl(
  chain: string,
  type: 'address' | 'tx',
  value: string,
): string | null {
  const explorers: Record<string, string> = {
    ETHEREUM: 'https://etherscan.io',
    BSC: 'https://bscscan.com',
    POLYGON: 'https://polygonscan.com',
    ARBITRUM: 'https://arbiscan.io',
    PAYBRIDGE: '', // Self-hosted chain, configure as needed
  };

  const baseUrl = explorers[chain];
  if (!baseUrl) {
    return null;
  }

  const path = type === 'address' ? 'address' : 'tx';
  return `${baseUrl}/${path}/${value}`;
}

/**
 * Parse amount with decimals to smallest unit (like wei)
 *
 * @param amount - Human-readable amount (e.g., "1.5")
 * @param decimals - Token decimals (default: 18)
 * @returns BigInt representation in smallest unit
 */
export function parseUnits(amount: string, decimals: number = 18): bigint {
  const [integer, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const value = integer + paddedFraction;
  return BigInt(value);
}

/**
 * Format smallest unit to human-readable amount
 *
 * @param value - Amount in smallest unit
 * @param decimals - Token decimals (default: 18)
 * @returns Human-readable amount string
 */
export function formatUnits(value: bigint | string, decimals: number = 18): string {
  const valueStr = value.toString();
  const padded = valueStr.padStart(decimals + 1, '0');
  const integerPart = padded.slice(0, -decimals) || '0';
  const fractionPart = padded.slice(-decimals);

  // Remove trailing zeros from fraction
  const trimmedFraction = fractionPart.replace(/0+$/, '');

  if (trimmedFraction) {
    return `${integerPart}.${trimmedFraction}`;
  }
  return integerPart;
}
