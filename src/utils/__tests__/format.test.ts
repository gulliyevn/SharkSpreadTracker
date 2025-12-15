import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatPriceWithSeparator,
  formatSpread,
  formatDateTime,
  formatTime,
  formatDate,
} from '../format';

describe('format', () => {
  describe('formatPrice', () => {
    it('should return "—" for null', () => {
      expect(formatPrice(null)).toBe('—');
    });

    it('should return "—" for undefined', () => {
      expect(formatPrice(undefined)).toBe('—');
    });

    it('should format with default 2 decimals', () => {
      expect(formatPrice(100.123)).toBe('100.12');
    });

    it('should format with custom decimals', () => {
      expect(formatPrice(100.123, 4)).toBe('100.1230');
    });

    it('should handle integers', () => {
      expect(formatPrice(100)).toBe('100.00');
    });
  });

  describe('formatPriceWithSeparator', () => {
    it('should return "—" for null', () => {
      expect(formatPriceWithSeparator(null)).toBe('—');
    });

    it('should format with thousand separators', () => {
      expect(formatPriceWithSeparator(1000)).toContain('1');
      expect(formatPriceWithSeparator(1000)).toContain('000');
    });
  });

  describe('formatSpread', () => {
    it('should return "—" for null', () => {
      expect(formatSpread(null)).toBe('—');
    });

    it('should return "—" for undefined', () => {
      expect(formatSpread(undefined)).toBe('—');
    });

    it('should format positive spread with + sign', () => {
      expect(formatSpread(5.5)).toBe('+5.50%');
    });

    it('should format negative spread', () => {
      expect(formatSpread(-3.2)).toBe('-3.20%');
    });

    it('should format zero spread', () => {
      expect(formatSpread(0)).toBe('+0.00%');
    });

    it('should format with 2 decimals', () => {
      expect(formatSpread(1.234)).toBe('+1.23%');
    });
  });

  describe('formatDateTime', () => {
    it('should format timestamp', () => {
      const timestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
      const result = formatDateTime(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should use custom options', () => {
      const timestamp = 1609459200000;
      const result = formatDateTime(timestamp, { year: 'numeric' });
      expect(result).toContain('2021');
    });
  });

  describe('formatTime', () => {
    it('should format time only', () => {
      const timestamp = 1609459200000;
      const result = formatTime(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDate', () => {
    it('should format date only', () => {
      const timestamp = 1609459200000;
      const result = formatDate(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
