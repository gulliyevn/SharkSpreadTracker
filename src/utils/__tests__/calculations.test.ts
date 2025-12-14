import { describe, it, expect } from 'vitest';
import {
  calculateSpread,
  isArbitrageOpportunity,
  roundToDecimals,
} from '../calculations';

describe('calculations', () => {
  describe('calculateSpread', () => {
    it('should return null for null source price', () => {
      expect(calculateSpread(null, 100)).toBeNull();
    });

    it('should return null for null target price', () => {
      expect(calculateSpread(100, null)).toBeNull();
    });

    it('should return null for undefined prices', () => {
      expect(calculateSpread(undefined, 100)).toBeNull();
      expect(calculateSpread(100, undefined)).toBeNull();
    });

    it('should return null for zero source price', () => {
      expect(calculateSpread(0, 100)).toBeNull();
    });

    it('should calculate positive spread', () => {
      const result = calculateSpread(100, 110);
      expect(result).toBe(10); // 10% spread
    });

    it('should calculate negative spread', () => {
      const result = calculateSpread(100, 90);
      expect(result).toBe(-10); // -10% spread
    });

    it('should calculate zero spread', () => {
      const result = calculateSpread(100, 100);
      expect(result).toBe(0);
    });

    it('should handle decimal prices', () => {
      const result = calculateSpread(100.5, 105.5);
      expect(result).toBeCloseTo(4.975, 2);
    });
  });

  describe('isArbitrageOpportunity', () => {
    it('should return false for null', () => {
      expect(isArbitrageOpportunity(null)).toBe(false);
    });

    it('should return false for negative spread', () => {
      expect(isArbitrageOpportunity(-5)).toBe(false);
    });

    it('should return false for zero spread', () => {
      expect(isArbitrageOpportunity(0)).toBe(false);
    });

    it('should return true for positive spread', () => {
      expect(isArbitrageOpportunity(5)).toBe(true);
    });

    it('should return true for small positive spread', () => {
      expect(isArbitrageOpportunity(0.01)).toBe(true);
    });
  });

  describe('roundToDecimals', () => {
    it('should round to 2 decimals by default', () => {
      expect(roundToDecimals(1.23456)).toBe(1.23);
    });

    it('should round to custom decimals', () => {
      expect(roundToDecimals(1.23456, 4)).toBe(1.2346);
    });

    it('should handle integers', () => {
      expect(roundToDecimals(100)).toBe(100);
    });

    it('should round up correctly', () => {
      expect(roundToDecimals(1.235, 2)).toBe(1.24);
    });

    it('should round down correctly', () => {
      expect(roundToDecimals(1.234, 2)).toBe(1.23);
    });
  });
});

