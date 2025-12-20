import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllTokens,
  getJupiterTokens,
  getPancakeTokens,
  getMexcTokens,
} from '../tokens.api';
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

// Мок для rateLimiter
vi.mock('@/utils/security', () => ({
  rateLimiter: {
    isAllowed: vi.fn(() => true), // По умолчанию разрешаем все запросы
    reset: vi.fn(),
  },
}));

// Мок для USE_MOCK_DATA
vi.mock('@/constants/api', async () => {
  const actual = await vi.importActual('@/constants/api');
  return {
    ...actual,
    USE_MOCK_DATA: true, // Включаем mock-данные для тестов
  };
});

describe('tokens.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getJupiterTokens', () => {
    it('should return empty array on error', async () => {
      vi.mocked(jupiterClient.get).mockRejectedValue(
        new Error('Network error')
      );
      const result = await getJupiterTokens();
      expect(result).toEqual([]);
    });

    it('should parse valid response', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: [
          {
            symbol: 'SOL',
            address: 'So11111111111111111111111111111111111111112',
          },
          {
            symbol: 'USDC',
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
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
      vi.mocked(pancakeClient.get).mockRejectedValue(
        new Error('Network error')
      );
      const result = await getPancakeTokens();
      expect(result).toEqual([]);
    });

    it('should extract tokens from pairs', async () => {
      // Мокируем несколько вызовов для разных токенов (getPancakeTokens делает поиск для популярных токенов)
      vi.mocked(pancakeClient.get)
        .mockResolvedValueOnce({
          data: {
            schemaVersion: '1.0.0',
            pairs: [
              {
                chainId: 'bsc',
                baseToken: { symbol: 'CAKE', address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' },
                quoteToken: { symbol: 'BNB', address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            schemaVersion: '1.0.0',
            pairs: [
              {
                chainId: 'bsc',
                baseToken: { symbol: 'BUSD', address: '0xe9e7cea3dedca5984780bafc599bd69add087d56' },
                quoteToken: { symbol: 'USDT', address: '0x55d398326f99059ff775485246999027b3197955' },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: {
            schemaVersion: '1.0.0',
            pairs: [],
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
            { symbol: 'BTCUSDT', baseAsset: 'BTC', status: '1', isSpotTradingAllowed: true },
            { symbol: 'ETHUSDT', baseAsset: 'ETH', status: '1', isSpotTradingAllowed: true },
            { symbol: 'DISABLED', baseAsset: 'DIS', status: '0', isSpotTradingAllowed: false },
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
        data: {
          symbols: [{ symbol: 'BTCUSDT', baseAsset: 'BTC', status: 'ENABLED' }],
        },
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
