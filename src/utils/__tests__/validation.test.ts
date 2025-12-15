import { describe, it, expect } from 'vitest';
import {
  validateApiKey,
  validateTokenSymbol,
  validatePrice,
  validateTimestamp,
} from '../validation';

describe('validation', () => {
  describe('validateApiKey', () => {
    it('should return false for null', () => {
      expect(validateApiKey(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateApiKey(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateApiKey('')).toBe(false);
    });

    it('should return false for short key', () => {
      expect(validateApiKey('short')).toBe(false);
    });

    it('should return true for valid key', () => {
      expect(validateApiKey('valid-api-key-12345')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(validateApiKey('  valid-key-12345  ')).toBe(true);
    });
  });

  describe('validateTokenSymbol', () => {
    it('should return false for null', () => {
      expect(validateTokenSymbol(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateTokenSymbol(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateTokenSymbol('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(validateTokenSymbol('   ')).toBe(false);
    });

    it('should return true for valid symbol', () => {
      expect(validateTokenSymbol('BTC')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(validateTokenSymbol('  SOL  ')).toBe(true);
    });
  });

  describe('validatePrice', () => {
    it('should return false for null', () => {
      expect(validatePrice(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validatePrice(undefined)).toBe(false);
    });

    it('should return false for zero', () => {
      expect(validatePrice(0)).toBe(false);
    });

    it('should return false for negative', () => {
      expect(validatePrice(-10)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(validatePrice(Infinity)).toBe(false);
    });

    it('should return true for positive number', () => {
      expect(validatePrice(100)).toBe(true);
    });

    it('should return true for decimal', () => {
      expect(validatePrice(0.01)).toBe(true);
    });
  });

  describe('validateTimestamp', () => {
    it('should return true for zero (epoch start)', () => {
      expect(validateTimestamp(0)).toBe(true); // 0 is valid (epoch)
    });

    it('should return false for negative', () => {
      expect(validateTimestamp(-1)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(validateTimestamp(Infinity)).toBe(false);
    });

    it('should return true for current timestamp', () => {
      expect(validateTimestamp(Date.now())).toBe(true);
    });

    it('should return false for future timestamp (more than 1 day)', () => {
      const future = Date.now() + 2 * 24 * 60 * 60 * 1000; // +2 days
      expect(validateTimestamp(future)).toBe(false);
    });

    it('should return true for timestamp within 1 day', () => {
      const future = Date.now() + 12 * 60 * 60 * 1000; // +12 hours
      expect(validateTimestamp(future)).toBe(true);
    });

    it('should return true for past timestamp', () => {
      const past = Date.now() - 1000; // 1 second ago
      expect(validateTimestamp(past)).toBe(true);
    });
  });
});
