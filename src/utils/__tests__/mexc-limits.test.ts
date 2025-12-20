import { describe, it, expect } from 'vitest';
import { extractMexcLimits } from '../mexc-limits';
import type { MexcSymbol } from '@/api/schemas/mexc.schema';

describe('mexc-limits', () => {
  describe('extractMexcLimits', () => {
    it('should return null if filters is not an array', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: null as unknown as [],
      };

      expect(extractMexcLimits(symbol)).toBeNull();
    });

    it('should return null if filters is empty', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [],
      };

      expect(extractMexcLimits(symbol)).toBeNull();
    });

    it('should extract MIN_NOTIONAL limit', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'MIN_NOTIONAL',
            minNotional: '10.0',
          },
        ],
      };

      const result = extractMexcLimits(symbol);
      expect(result).toEqual({ minNotional: 10.0 });
    });

    it('should extract LOT_SIZE limits', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'LOT_SIZE',
            minQty: '0.001',
            maxQty: '1000.0',
            stepSize: '0.001',
          },
        ],
      };

      const result = extractMexcLimits(symbol);
      expect(result).toEqual({
        minQty: 0.001,
        maxQty: 1000.0,
        stepSize: 0.001,
      });
    });

    it('should extract both MIN_NOTIONAL and LOT_SIZE limits', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'MIN_NOTIONAL',
            minNotional: '10.0',
          },
          {
            filterType: 'LOT_SIZE',
            minQty: '0.001',
            maxQty: '1000.0',
            stepSize: '0.001',
          },
        ],
      };

      const result = extractMexcLimits(symbol);
      expect(result).toEqual({
        minNotional: 10.0,
        minQty: 0.001,
        maxQty: 1000.0,
        stepSize: 0.001,
      });
    });

    it('should return null if no valid limits found', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'PRICE_FILTER',
            minPrice: '0.01',
            maxPrice: '1000000.0',
            tickSize: '0.01',
          },
        ],
      };

      expect(extractMexcLimits(symbol)).toBeNull();
    });

    it('should handle invalid numeric values', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'MIN_NOTIONAL',
            minNotional: 'invalid',
          },
        ],
      };

      const result = extractMexcLimits(symbol);
      expect(result).toBeNull();
    });

    it('should ignore zero or negative values', () => {
      const symbol: MexcSymbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'MIN_NOTIONAL',
            minNotional: '0',
          },
          {
            filterType: 'LOT_SIZE',
            minQty: '-1',
            maxQty: '0',
            stepSize: '0.001',
          },
        ],
      };

      const result = extractMexcLimits(symbol);
      // Только stepSize должен быть извлечен (положительное значение)
      expect(result).toEqual({ stepSize: 0.001 });
    });

    it('should handle filters with wrong filterType', () => {
      const symbol = {
        symbol: 'BTCUSDT',
        status: 'ENABLED',
        filters: [
          {
            filterType: 'UNKNOWN_FILTER',
            someField: 'value',
          },
        ],
      } as unknown as MexcSymbol;

      expect(extractMexcLimits(symbol)).toBeNull();
    });
  });
});
