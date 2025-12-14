import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllTokens, getJupiterTokens, getPancakeTokens, getMexcTokens } from '../tokens.api';
import { jupiterClient, pancakeClient, mexcClient } from '../../clients';

// Моки для клиентов
vi.mock('../../clients', () => ({
  jupiterClient: {
    get: vi.fn(),
  },
  pancakeClient: {
    get: vi.fn(),
  },
  mexcClient: {
    get: vi.fn(),
  },
}));

describe('tokens.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getJupiterTokens', () => {
    it('should return empty array on error', async () => {
      vi.mocked(jupiterClient.get).mockRejectedValue(new Error('Network error'));
      const result = await getJupiterTokens();
      expect(result).toEqual([]);
    });

    it('should parse valid response', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: [
          { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
          { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
        ],
      });

      const result = await getJupiterTokens();
      expect(result).toHaveLength(2);
      expect(result[0]?.symbol).toBe('SOL');
      expect(result[0]?.chain).toBe('solana');
    });

    it('should filter invalid tokens', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: [
          { symbol: 'SOL', address: 'valid' },
          { symbol: '', address: 'invalid' }, // No symbol
          { address: 'invalid2' }, // No symbol
        ],
      });

      const result = await getJupiterTokens();
      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('SOL');
    });
  });

  describe('getPancakeTokens', () => {
    it('should return empty array on error', async () => {
      vi.mocked(pancakeClient.get).mockRejectedValue(new Error('Network error'));
      const result = await getPancakeTokens();
      expect(result).toEqual([]);
    });

    it('should extract tokens from pairs', async () => {
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: {
          pairs: [
            {
              baseToken: { symbol: 'CAKE' },
              quoteToken: { symbol: 'BNB' },
            },
            {
              baseToken: { symbol: 'BUSD' },
              quoteToken: { symbol: 'USDT' },
            },
          ],
        },
      });

      const result = await getPancakeTokens();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((t) => t.symbol === 'CAKE')).toBe(true);
    });
  });

  describe('getMexcTokens', () => {
    it('should return empty array on error', async () => {
      vi.mocked(mexcClient.get).mockRejectedValue(new Error('Network error'));
      const result = await getMexcTokens();
      expect(result).toEqual([]);
    });

    it('should parse valid response', async () => {
      vi.mocked(mexcClient.get).mockResolvedValue({
        data: {
          symbols: [
            { symbol: 'BTCUSDT', baseAsset: 'BTC', status: 'ENABLED' },
            { symbol: 'ETHUSDT', baseAsset: 'ETH', status: 'ENABLED' },
            { symbol: 'DISABLED', baseAsset: 'DIS', status: 'DISABLED' },
          ],
        },
      });

      const result = await getMexcTokens();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((t) => t.symbol === 'BTC')).toBe(true);
      expect(result.some((t) => t.symbol === 'DIS')).toBe(false); // Disabled should be filtered
    });
  });

  describe('getAllTokens', () => {
    it('should return mock tokens when all APIs fail', async () => {
      vi.mocked(jupiterClient.get).mockRejectedValue(new Error('Error'));
      vi.mocked(pancakeClient.get).mockRejectedValue(new Error('Error'));
      vi.mocked(mexcClient.get).mockRejectedValue(new Error('Error'));

      const result = await getAllTokens();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('chain');
    });

    it('should merge tokens from all sources', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: [{ symbol: 'SOL', address: 'valid' }],
      });
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: { pairs: [{ baseToken: { symbol: 'CAKE' } }] },
      });
      vi.mocked(mexcClient.get).mockResolvedValue({
        data: { symbols: [{ symbol: 'BTCUSDT', baseAsset: 'BTC', status: 'ENABLED' }] },
      });

      const result = await getAllTokens();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should remove duplicates', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: [{ symbol: 'SOL', address: 'valid' }],
      });
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: { pairs: [] },
      });
      vi.mocked(mexcClient.get).mockResolvedValue({
        data: { symbols: [] },
      });

      const result = await getAllTokens();
      const symbols = result.map((t) => t.symbol);
      const uniqueSymbols = new Set(symbols);
      expect(symbols.length).toBe(uniqueSymbols.size);
    });
  });
});

