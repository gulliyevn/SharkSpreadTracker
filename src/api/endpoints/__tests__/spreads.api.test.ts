import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSpreadData, calculateSpreads } from '../spreads.api';
import { getAllPrices } from '../prices.api';
import type { Token } from '@/types';

vi.mock('../prices.api', () => ({
  getAllPrices: vi.fn(),
}));

describe('spreads.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpreadData', () => {
    it('should fetch spread data successfully', async () => {
      const mockToken: Token = { symbol: 'BTC', chain: 'solana' };

      vi.mocked(getAllPrices).mockResolvedValue({
        symbol: 'BTC',
        chain: 'solana',
        jupiter: {
          price: 50000,
          timestamp: Date.now(),
          source: 'jupiter',
        },
        pancakeswap: null,
        mexc: {
          price: 50100,
          bid: 50000,
          ask: 50200,
          timestamp: Date.now(),
          source: 'mexc',
        },
        timestamp: Date.now(),
      });

      const result = await getSpreadData(mockToken);

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('BTC');
      expect(result?.current).toBeDefined();
      expect(result?.sources.jupiter).toBe(true);
      expect(result?.sources.mexc).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockToken: Token = { symbol: 'BTC', chain: 'solana' };

      vi.mocked(getAllPrices).mockRejectedValue(new Error('API Error'));

      await expect(getSpreadData(mockToken)).rejects.toThrow();
    });
  });

  describe('calculateSpreads', () => {
    it('should calculate direct spread for Solana', () => {
      const allPrices = {
        symbol: 'BTC',
        chain: 'solana' as const,
        jupiter: {
          price: 50000,
          timestamp: Date.now(),
          source: 'jupiter' as const,
        },
        pancakeswap: null,
        mexc: {
          price: 50200,
          timestamp: Date.now(),
          source: 'mexc' as const,
        },
        timestamp: Date.now(),
      };

      const result = calculateSpreads(allPrices);

      expect(result.directSpread).toBeDefined();
      expect(result.source1).toBe('jupiter');
      expect(result.source2).toBe('mexc');
    });

    it('should calculate reverse spread for BSC', () => {
      const allPrices = {
        symbol: 'ETH',
        chain: 'bsc' as const,
        jupiter: null,
        pancakeswap: {
          price: 2000,
          timestamp: Date.now(),
          source: 'pancakeswap' as const,
        },
        mexc: {
          price: 2010,
          timestamp: Date.now(),
          source: 'mexc' as const,
        },
        timestamp: Date.now(),
      };

      const result = calculateSpreads(allPrices);

      expect(result.reverseSpread).toBeDefined();
      expect(result.source1).toBe('pancakeswap');
      expect(result.source2).toBe('mexc');
    });

    it('should return null when prices are missing', () => {
      const allPrices = {
        symbol: 'BTC',
        chain: 'solana' as const,
        jupiter: null,
        pancakeswap: null,
        mexc: null,
        timestamp: Date.now(),
      };

      const result = calculateSpreads(allPrices);

      expect(result.directSpread).toBeNull();
      expect(result.reverseSpread).toBeNull();
    });

    it('should handle null prices gracefully', () => {
      const allPrices = {
        symbol: 'BTC',
        chain: 'solana' as const,
        jupiter: { price: null, timestamp: Date.now(), source: 'jupiter' as const },
        pancakeswap: null,
        mexc: { price: 50000, timestamp: Date.now(), source: 'mexc' as const },
        timestamp: Date.now(),
      };

      const result = calculateSpreads(allPrices);

      expect(result.directSpread).toBeNull();
      expect(result.reverseSpread).toBeDefined();
    });

    it('should calculate spreads correctly for BSC with null pancakeswap', () => {
      const allPrices = {
        symbol: 'ETH',
        chain: 'bsc' as const,
        jupiter: null,
        pancakeswap: null,
        mexc: { price: 2000, timestamp: Date.now(), source: 'mexc' as const },
        timestamp: Date.now(),
      };

      const result = calculateSpreads(allPrices);

      expect(result.directSpread).toBeNull();
      expect(result.reverseSpread).toBeNull();
    });
  });
});
