import { describe, it, expect } from 'vitest';
import {
  DexScreenerTokenSchema,
  DexScreenerPairSchema,
  DexScreenerResponseSchema,
} from '../pancake.schema';

describe('Pancake/DexScreener Schemas', () => {
  describe('DexScreenerTokenSchema', () => {
    it('should validate valid token', () => {
      const validToken = {
        address: '0x123',
        symbol: 'CAKE',
        name: 'PancakeSwap Token',
      };

      const result = DexScreenerTokenSchema.safeParse(validToken);
      expect(result.success).toBe(true);
    });

    it('should reject token without symbol', () => {
      const invalidToken = {
        address: '0x123',
      };

      const result = DexScreenerTokenSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });
  });

  describe('DexScreenerPairSchema', () => {
    it('should validate valid pair', () => {
      const validPair = {
        chainId: 'bsc',
        dexId: 'pancakeswap',
        baseToken: {
          symbol: 'CAKE',
        },
        quoteToken: {
          symbol: 'BNB',
        },
        priceUsd: '2.5',
      };

      const result = DexScreenerPairSchema.safeParse(validPair);
      expect(result.success).toBe(true);
    });

    it('should allow additional fields (passthrough)', () => {
      const pairWithExtra = {
        chainId: 'bsc',
        baseToken: {
          symbol: 'CAKE',
        },
        customField: 'value',
      };

      const result = DexScreenerPairSchema.safeParse(pairWithExtra);
      expect(result.success).toBe(true);
    });
  });

  describe('DexScreenerResponseSchema', () => {
    it('should validate response with pairs array', () => {
      const validResponse = {
        pairs: [
          {
            chainId: 'bsc',
            baseToken: { symbol: 'CAKE' },
            priceUsd: '2.5',
          },
        ],
      };

      const result = DexScreenerResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate response with single pair', () => {
      const validResponse = {
        pair: {
          chainId: 'bsc',
          baseToken: { symbol: 'CAKE' },
          priceUsd: '2.5',
        },
      };

      const result = DexScreenerResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });
});

