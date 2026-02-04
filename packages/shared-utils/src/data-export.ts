/**
 * Data export utilities for CSV and Excel formats
 */

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

/**
 * Convert data to CSV format
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
): string {
  // Header row
  const headerRow = columns.map((col) => escapeCSVField(col.header)).join(',');

  // Data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const value = getNestedValue(row, col.key as string);
        const formatted = col.formatter
          ? col.formatter(value, row)
          : String(value ?? '');
        return escapeCSVField(formatted);
      })
      .join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape CSV field (handles commas, quotes, newlines)
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Get nested object value by dot notation key
 */
function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Download data as CSV file (browser only)
 * @throws Error if called in non-browser environment
 */
export function downloadCSV(csv: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('downloadCSV can only be used in browser environment');
  }

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Format amount for export (with specified decimal places)
 */
export function formatAmountForExport(
  amount: string | number | null | undefined,
  decimals = 2,
): string {
  if (amount === null || amount === undefined) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals);
}

/**
 * Common export column presets for orders
 */
export const OrderExportColumns = {
  topup: [
    { key: 'orderNo', header: 'Order No' },
    { key: 'merchantOrderNo', header: 'Merchant Order No' },
    { key: 'status', header: 'Status' },
    {
      key: 'fiatAmount',
      header: 'Fiat Amount',
      formatter: (v: unknown) => formatAmountForExport(v as string),
    },
    { key: 'fiatCurrency', header: 'Currency' },
    {
      key: 'tokenAmount',
      header: 'Token Amount',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    {
      key: 'fee',
      header: 'Fee',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    {
      key: 'actualAmount',
      header: 'Actual Amount',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      formatter: (v: unknown) => formatDateForExport(v as string),
    },
    {
      key: 'paidAt',
      header: 'Paid At',
      formatter: (v: unknown) => formatDateForExport(v as string),
    },
  ],
  settlement: [
    { key: 'settlementNo', header: 'Settlement No' },
    { key: 'status', header: 'Status' },
    {
      key: 'tokenAmount',
      header: 'Token Amount',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    {
      key: 'fee',
      header: 'Fee',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    {
      key: 'exchangeRate',
      header: 'Exchange Rate',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    {
      key: 'usdtAmount',
      header: 'USDT Amount',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    { key: 'receivingAddress', header: 'Receiving Address' },
    {
      key: 'createdAt',
      header: 'Created At',
      formatter: (v: unknown) => formatDateForExport(v as string),
    },
    {
      key: 'completedAt',
      header: 'Completed At',
      formatter: (v: unknown) => formatDateForExport(v as string),
    },
  ],
  refund: [
    { key: 'refundNo', header: 'Refund No' },
    { key: 'status', header: 'Status' },
    {
      key: 'refundFiatAmount',
      header: 'Refund Amount',
      formatter: (v: unknown) => formatAmountForExport(v as string),
    },
    {
      key: 'depositDeduction',
      header: 'Deposit Deduction',
      formatter: (v: unknown) => formatAmountForExport(v as string, 8),
    },
    { key: 'reason', header: 'Reason' },
    {
      key: 'createdAt',
      header: 'Created At',
      formatter: (v: unknown) => formatDateForExport(v as string),
    },
  ],
};
