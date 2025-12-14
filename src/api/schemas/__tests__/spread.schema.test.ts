import { describe, it, expect } from 'vitest';
import {
  SpreadDataPointSchema,
  CurrentDataSchema,
  SourcesSchema,
  SpreadResponseSchema,
  SpreadCalculationSchema,
} from '../spread.schema';

describe('Spread Schemas', () => {
  describe('SpreadDataPointSchema', () => {
    it('should validate valid data point', () => {
      const validPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      const result = SpreadDataPointSchema.safeParse(validPoint);
      expect(result.success).toBe(true);
    });

    it('should require positive timestamp', () => {
      const invalidPoint = {
        timestamp: -1,
        mexc_price: 50000,
        jupiter_price: 50100,
      };

      const result = SpreadDataPointSchema.safeParse(invalidPoint);
      expect(result.success).toBe(false);
    });
  });

  describe('CurrentDataSchema', () => {
    it('should validate valid current data', () => {
      const validData = {
        timestamp: Date.now(),
        mexc_bid: 49900,
        mexc_ask: 50100,
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      const result = CurrentDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('SourcesSchema', () => {
    it('should validate sources object', () => {
      const validSources = {
        mexc: true,
        jupiter: true,
        pancakeswap: false,
      };

      const result = SourcesSchema.safeParse(validSources);
      expect(result.success).toBe(true);
    });
  });

  describe('SpreadResponseSchema', () => {
    it('should validate complete spread response', () => {
      const validResponse = {
        symbol: 'BTC',
        chain: 'solana',
        history: [],
        current: {
          timestamp: Date.now(),
          mexc_price: 50000,
          jupiter_price: 50100,
          pancakeswap_price: null,
          mexc_bid: null,
          mexc_ask: null,
        },
        sources: {
          mexc: true,
          jupiter: true,
          pancakeswap: false,
        },
      };

      const result = SpreadResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate chain enum', () => {
      const validResponse = {
        symbol: 'BTC',
        chain: 'bsc',
        history: [],
        current: null,
        sources: {
          mexc: true,
          jupiter: false,
          pancakeswap: true,
        },
      };

      const result = SpreadResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid chain', () => {
      const invalidResponse = {
        symbol: 'BTC',
        chain: 'ethereum',
        history: [],
        current: null,
        sources: {
          mexc: true,
          jupiter: false,
          pancakeswap: false,
        },
      };

      const result = SpreadResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('SpreadCalculationSchema', () => {
    it('should validate spread calculation', () => {
      const validCalculation = {
        directSpread: 2.5,
        reverseSpread: -2.4,
        sourcePrice: 50000,
        targetPrice: 51250,
        timestamp: Date.now(),
      };

      const result = SpreadCalculationSchema.safeParse(validCalculation);
      expect(result.success).toBe(true);
    });
  });
});

