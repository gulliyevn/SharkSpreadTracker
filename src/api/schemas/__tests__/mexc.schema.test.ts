import { describe, it, expect } from 'vitest';
import {
  MexcSymbolSchema,
  MexcTickerSchema,
  MexcTickersResponseSchema,
} from '../mexc.schema';

describe('MEXC Schemas', () => {
  describe('MexcSymbolSchema', () => {
    it('should validate valid symbol', () => {
      const validSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
      };

      const result = MexcSymbolSchema.safeParse(validSymbol);
      expect(result.success).toBe(true);
    });

    it('should reject symbol without required fields', () => {
      const invalidSymbol = {
        baseAsset: 'BTC',
      };

      const result = MexcSymbolSchema.safeParse(invalidSymbol);
      expect(result.success).toBe(false);
    });

    it('should validate status enum', () => {
      const validSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
      };

      const result = MexcSymbolSchema.safeParse(validSymbol);
      expect(result.success).toBe(true);
    });
  });

  describe('MexcTickerSchema', () => {
    it('should validate valid ticker', () => {
      const validTicker = {
        symbol: 'BTCUSDT',
        price: '50000.5',
        lastPrice: '50000.5',
        bidPrice: '49900',
        askPrice: '50100',
      };

      const result = MexcTickerSchema.safeParse(validTicker);
      expect(result.success).toBe(true);
    });

    it('should reject invalid price format', () => {
      const invalidTicker = {
        symbol: 'BTCUSDT',
        price: 'invalid',
      };

      const result = MexcTickerSchema.safeParse(invalidTicker);
      expect(result.success).toBe(false);
    });

    it('should require symbol', () => {
      const invalidTicker = {
        price: '50000',
      };

      const result = MexcTickerSchema.safeParse(invalidTicker);
      expect(result.success).toBe(false);
    });
  });

  describe('MexcTickersResponseSchema', () => {
    it('should validate array of tickers', () => {
      const validTickers = [
        {
          symbol: 'BTCUSDT',
          price: '50000',
        },
        {
          symbol: 'ETHUSDT',
          price: '2000',
        },
      ];

      const result = MexcTickersResponseSchema.safeParse(validTickers);
      expect(result.success).toBe(true);
    });
  });
});

