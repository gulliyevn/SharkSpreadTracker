import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MexcSource } from '../MexcSource';
import { mexcClient } from '../../clients';
import { rateLimiter } from '@/utils/security';
import { isCanceledError } from '@/utils/errors';

// Мокируем зависимости
vi.mock('../../clients', () => ({
  mexcClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/security', () => ({
  rateLimiter: {
    isAllowed: vi.fn(() => true),
  },
}));

vi.mock('@/utils/request-queue', () => ({
  queuedRequest: vi.fn(async (fn, _options) => {
    return await fn();
  }),
  RequestPriority: {
    NORMAL: 'normal',
  },
}));

vi.mock('@/utils/validation', () => ({
  validateTokenSymbol: vi.fn((symbol) => symbol && symbol.length >= 2),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/utils/errors', () => ({
  isCanceledError: vi.fn(() => false),
}));

vi.mock('../schemas', () => ({
  MexcTickerSchema: {
    safeParse: vi.fn((data) => {
      if (data && data.price) {
        return { success: true, data };
      }
      return { success: false, error: null };
    }),
  },
}));

describe('MexcSource', () => {
  let source: MexcSource;

  beforeEach(() => {
    source = new MexcSource();
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct id', () => {
      expect(source.id).toBe('mexc');
    });

    it('should have correct name', () => {
      expect(source.name).toBe('MEXC');
    });

    it('should support both chains', () => {
      expect(source.supportedChains).toEqual(['solana', 'bsc']);
      expect(source.supportsChain('solana')).toBe(true);
      expect(source.supportsChain('bsc')).toBe(true);
    });

    it('should not require address', () => {
      expect(source.requiresAddress()).toBe(false);
    });
  });

  describe('getTokens', () => {
    it('should fetch tokens successfully', async () => {
      const mockResponse = {
        data: {
          symbols: [
            {
              symbol: 'BTCUSDT',
              status: '1',
              baseAsset: 'BTC',
              isSpotTradingAllowed: true,
            },
            {
              symbol: 'ETHUSDT',
              status: '1',
              baseAsset: 'ETH',
              isSpotTradingAllowed: true,
            },
          ],
        },
      };

      vi.mocked(mexcClient.get).mockResolvedValue(mockResponse as any);

      const tokens = await source.getTokens();
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].chain).toBe('bsc');
    });

    it('should filter inactive tokens', async () => {
      const mockResponse = {
        data: {
          symbols: [
            {
              symbol: 'BTCUSDT',
              status: '0', // Inactive
              baseAsset: 'BTC',
              isSpotTradingAllowed: false,
            },
          ],
        },
      };

      vi.mocked(mexcClient.get).mockResolvedValue(mockResponse as any);

      const tokens = await source.getTokens();
      expect(tokens).toEqual([]);
    });
  });

  describe('getPrice', () => {
    it('should fetch price successfully from bookTicker', async () => {
      const mockResponse = {
        data: {
          symbol: 'BTCUSDT',
          price: '50000.5',
          bidPrice: '49999.0',
          askPrice: '50001.0',
        },
      };

      vi.mocked(mexcClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice('BTCUSDT');
      expect(price).not.toBeNull();
      expect(price?.price).toBe(50000.5);
      expect(price?.bid).toBe(49999.0);
      expect(price?.ask).toBe(50001.0);
      expect(price?.source).toBe('mexc');
    });

    it('should handle array response from bookTicker', async () => {
      const mockResponse = {
        data: [
          {
            symbol: 'BTCUSDT',
            price: '50000.5',
            bidPrice: '49999.0',
            askPrice: '50001.0',
          },
        ],
      };

      vi.mocked(mexcClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice('BTCUSDT');
      expect(price).not.toBeNull();
      expect(price?.price).toBe(50000.5);
    });

    it('should fallback to ticker/price when bookTicker fails', async () => {
      // Первый вызов (bookTicker) возвращает невалидные данные
      vi.mocked(mexcClient.get)
        .mockResolvedValueOnce({ data: null } as any)
        .mockResolvedValueOnce({
          data: { price: '50000.5' },
        } as any);

      const price = await source.getPrice('BTCUSDT');
      expect(price).not.toBeNull();
      expect(price?.price).toBe(50000.5);
      expect(mexcClient.get).toHaveBeenCalledTimes(2);
    });

    it('should return null when price is invalid', async () => {
      const mockResponse = {
        data: {
          symbol: 'BTCUSDT',
          price: '0',
        },
      };

      vi.mocked(mexcClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice('BTCUSDT');
      expect(price).toBeNull();
    });
  });
});

