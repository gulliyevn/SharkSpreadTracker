import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JupiterSource } from '../JupiterSource';
import { jupiterClient } from '../../clients';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';
import { queuedRequest } from '@/utils/request-queue';

// Мокируем зависимости
vi.mock('../../clients', () => ({
  jupiterClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
  },
}));

vi.mock('@/utils/validation', () => ({
  validateTokenSymbol: vi.fn((symbol) => symbol && symbol.length >= 2),
}));

describe('JupiterSource', () => {
  let source: JupiterSource;

  beforeEach(() => {
    source = new JupiterSource();
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct id', () => {
      expect(source.id).toBe('jupiter');
    });

    it('should have correct name', () => {
      expect(source.name).toBe('Jupiter');
    });

    it('should support solana chain', () => {
      expect(source.supportedChains).toEqual(['solana']);
      expect(source.supportsChain('solana')).toBe(true);
      expect(source.supportsChain('bsc')).toBe(false);
    });

    it('should require address', () => {
      expect(source.requiresAddress()).toBe(true);
    });
  });

  describe('getTokens', () => {
    it('should fetch tokens successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Solana',
          },
          {
            id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            symbol: 'USDC',
          },
        ],
      };

      vi.mocked(jupiterClient.get).mockResolvedValue(mockResponse as any);

      const tokens = await source.getTokens();
      expect(tokens).toHaveLength(2);
      expect(tokens[0].symbol).toBe('SOL');
      expect(tokens[0].chain).toBe('solana');
      expect(tokens[0].address).toBe('So11111111111111111111111111111111111111112');
    });

    it('should try multiple endpoints if first fails', async () => {
      vi.mocked(jupiterClient.get)
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce({
          data: [{ id: 'test', symbol: 'TEST' }],
        } as any);

      const tokens = await source.getTokens();
      expect(jupiterClient.get).toHaveBeenCalledTimes(2);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should return empty array when rate limit exceeded', async () => {
      vi.mocked(rateLimiter.isAllowed).mockReturnValue(false);
      const tokens = await source.getTokens();
      expect(tokens).toEqual([]);
    });

    it('should filter invalid tokens', async () => {
      const mockResponse = {
        data: [
          { id: 'test1', symbol: 'VALID' },
          { id: 'test2', symbol: '4' }, // Invalid
          { id: 'test3', symbol: 'ANOTHER' },
        ],
      };

      vi.mocked(jupiterClient.get).mockResolvedValue(mockResponse as any);
      const tokens = await source.getTokens();
      // Должны остаться только валидные токены
      expect(tokens.every((t) => t.symbol !== '4')).toBe(true);
    });
  });

  describe('getPrice', () => {
    it('should fetch price successfully', async () => {
      const address = 'So11111111111111111111111111111111111111112';
      const mockResponse = {
        data: {
          [address]: {
            usdPrice: 100.5,
          },
        },
      };

      vi.mocked(jupiterClient.get).mockResolvedValue(mockResponse as any);
      vi.mocked(rateLimiter.isAllowed).mockReturnValue(true);

      const price = await source.getPrice('SOL', address);

      expect(price).not.toBeNull();
      if (price) {
        expect(price.price).toBe(100.5);
        expect(price.source).toBe('jupiter');
      }
    });

    it('should return null when address is not provided', async () => {
      const price = await source.getPrice('SOL');
      expect(price).toBeNull();
      expect(jupiterClient.get).not.toHaveBeenCalled();
    });

    it('should return null when price is invalid', async () => {
      const mockResponse = {
        data: {
          'So11111111111111111111111111111111111111112': {
            usdPrice: 0, // Invalid price
          },
        },
      };

      vi.mocked(jupiterClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice(
        'SOL',
        'So11111111111111111111111111111111111111112'
      );

      expect(price).toBeNull();
    });

    it('should return null when price data is missing', async () => {
      const mockResponse = {
        data: {},
      };

      vi.mocked(jupiterClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice(
        'SOL',
        'So11111111111111111111111111111111111111112'
      );

      expect(price).toBeNull();
    });
  });
});

