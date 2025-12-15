import { describe, it, expect } from 'vitest';
import {
  JupiterTokenSchema,
  JupiterTokensResponseSchema,
  JupiterPriceSchema,
  JupiterPricesResponseSchema,
} from '../jupiter.schema';

describe('Jupiter Schemas', () => {
  describe('JupiterTokenSchema', () => {
    it('should validate valid token', () => {
      const validToken = {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
      };

      const result = JupiterTokenSchema.safeParse(validToken);
      expect(result.success).toBe(true);
    });

    it('should reject token without address', () => {
      const invalidToken = {
        symbol: 'SOL',
      };

      const result = JupiterTokenSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });

    it('should reject token without symbol', () => {
      const invalidToken = {
        address: 'So11111111111111111111111111111111111111112',
      };

      const result = JupiterTokenSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });
  });

  describe('JupiterTokensResponseSchema', () => {
    it('should validate array of tokens', () => {
      const validTokens = [
        {
          address: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
        },
      ];

      const result = JupiterTokensResponseSchema.safeParse(validTokens);
      expect(result.success).toBe(true);
    });
  });

  describe('JupiterPriceSchema', () => {
    it('should validate price with positive value', () => {
      const validPrice = {
        price: 100.5,
        id: 'SOL',
      };

      const result = JupiterPriceSchema.safeParse(validPrice);
      expect(result.success).toBe(true);
    });

    it('should validate price with null', () => {
      const validPrice = {
        price: null,
        id: 'SOL',
      };

      const result = JupiterPriceSchema.safeParse(validPrice);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidPrice = {
        price: -100,
        id: 'SOL',
      };

      const result = JupiterPriceSchema.safeParse(invalidPrice);
      expect(result.success).toBe(false);
    });
  });

  describe('JupiterPricesResponseSchema', () => {
    it('should validate prices record', () => {
      const validPrices = {
        So11111111111111111111111111111111111111112: {
          price: 100.5,
          id: 'SOL',
        },
        EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
          price: 1.0,
          id: 'USDC',
        },
      };

      const result = JupiterPricesResponseSchema.safeParse(validPrices);
      expect(result.success).toBe(true);
    });
  });
});
