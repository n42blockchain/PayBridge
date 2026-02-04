import { describe, it, expect } from 'vitest';
import {
  toCSV,
  formatDateForExport,
  formatAmountForExport,
  OrderExportColumns,
} from './data-export';

describe('Data Export Utilities', () => {
  describe('toCSV', () => {
    it('should convert simple data to CSV', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'age' as const, header: 'Age' },
      ];

      const csv = toCSV(data, columns);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Name,Age');
      expect(lines[1]).toBe('Alice,30');
      expect(lines[2]).toBe('Bob,25');
    });

    it('should escape fields with commas', () => {
      const data = [{ desc: 'Hello, World' }];
      const columns = [{ key: 'desc' as const, header: 'Description' }];

      const csv = toCSV(data, columns);
      expect(csv).toContain('"Hello, World"');
    });

    it('should escape fields with quotes', () => {
      const data = [{ desc: 'Say "Hello"' }];
      const columns = [{ key: 'desc' as const, header: 'Description' }];

      const csv = toCSV(data, columns);
      expect(csv).toContain('"Say ""Hello"""');
    });

    it('should escape fields with newlines', () => {
      const data = [{ desc: 'Line1\nLine2' }];
      const columns = [{ key: 'desc' as const, header: 'Description' }];

      const csv = toCSV(data, columns);
      expect(csv).toContain('"Line1\nLine2"');
    });

    it('should handle null and undefined values', () => {
      const data = [
        { name: 'Alice', value: null },
        { name: 'Bob', value: undefined },
      ];
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'value' as const, header: 'Value' },
      ];

      const csv = toCSV(data, columns);
      const lines = csv.split('\n');

      expect(lines[1]).toBe('Alice,');
      expect(lines[2]).toBe('Bob,');
    });

    it('should apply custom formatters', () => {
      const data = [{ amount: '1234.5678' }];
      const columns = [
        {
          key: 'amount' as const,
          header: 'Amount',
          formatter: (v: unknown) => parseFloat(v as string).toFixed(2),
        },
      ];

      const csv = toCSV(data, columns);
      expect(csv).toContain('1234.57');
    });

    it('should handle nested keys', () => {
      const data = [{ user: { name: 'Alice' } }];
      const columns = [{ key: 'user.name', header: 'User Name' }];

      const csv = toCSV(data, columns);
      expect(csv).toContain('Alice');
    });

    it('should handle empty data array', () => {
      const data: Array<{ name: string }> = [];
      const columns = [{ key: 'name' as const, header: 'Name' }];

      const csv = toCSV(data, columns);
      expect(csv).toBe('Name');
    });
  });

  describe('formatDateForExport', () => {
    it('should format ISO date string', () => {
      const result = formatDateForExport('2024-02-03T12:30:45.000Z');
      expect(result).toBe('2024-02-03 12:30:45');
    });

    it('should format Date object', () => {
      const date = new Date('2024-02-03T12:30:45.000Z');
      const result = formatDateForExport(date);
      expect(result).toBe('2024-02-03 12:30:45');
    });

    it('should handle null', () => {
      expect(formatDateForExport(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(formatDateForExport(undefined)).toBe('');
    });
  });

  describe('formatAmountForExport', () => {
    it('should format number with default 2 decimals', () => {
      expect(formatAmountForExport(123.456)).toBe('123.46');
    });

    it('should format string number', () => {
      expect(formatAmountForExport('123.456')).toBe('123.46');
    });

    it('should format with custom decimals', () => {
      expect(formatAmountForExport(123.456789, 4)).toBe('123.4568');
    });

    it('should handle null', () => {
      expect(formatAmountForExport(null)).toBe('0');
    });

    it('should handle undefined', () => {
      expect(formatAmountForExport(undefined)).toBe('0');
    });

    it('should handle zero', () => {
      expect(formatAmountForExport(0)).toBe('0.00');
    });
  });

  describe('OrderExportColumns', () => {
    it('should have topup columns defined', () => {
      expect(OrderExportColumns.topup).toBeDefined();
      expect(OrderExportColumns.topup.length).toBeGreaterThan(0);
      expect(OrderExportColumns.topup.find((c) => c.key === 'orderNo')).toBeDefined();
    });

    it('should have settlement columns defined', () => {
      expect(OrderExportColumns.settlement).toBeDefined();
      expect(OrderExportColumns.settlement.length).toBeGreaterThan(0);
      expect(OrderExportColumns.settlement.find((c) => c.key === 'settlementNo')).toBeDefined();
    });

    it('should have refund columns defined', () => {
      expect(OrderExportColumns.refund).toBeDefined();
      expect(OrderExportColumns.refund.length).toBeGreaterThan(0);
      expect(OrderExportColumns.refund.find((c) => c.key === 'refundNo')).toBeDefined();
    });

    it('should have formatters for amount fields', () => {
      const topupAmountCol = OrderExportColumns.topup.find((c) => c.key === 'fiatAmount');
      expect(topupAmountCol?.formatter).toBeDefined();
      expect(topupAmountCol?.formatter?.('123.456', {} as never)).toBe('123.46');
    });

    it('should have formatters for date fields', () => {
      const topupDateCol = OrderExportColumns.topup.find((c) => c.key === 'createdAt');
      expect(topupDateCol?.formatter).toBeDefined();
      const result = topupDateCol?.formatter?.('2024-02-03T12:30:45.000Z', {} as never);
      expect(result).toBe('2024-02-03 12:30:45');
    });
  });
});
