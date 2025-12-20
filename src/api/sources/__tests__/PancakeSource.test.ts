import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PancakeSource } from '../PancakeSource';
import { pancakeClient } from '../../clients';
import { rateLimiter } from '@/utils/security';
import { queuedRequest } from '@/utils/request-queue';

// Мокируем зависимости
vi.mock('../../clients', () => ({
  pancakeClient: {
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
  },
}));

vi.mock('../schemas', () => ({
  DexScreenerResponseSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
}));

describe('PancakeSource', () => {
  let source: PancakeSource;

  beforeEach(() => {
    source = new PancakeSource();
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct id', () => {
      expect(source.id).toBe('pancakeswap');
    });

    it('should have correct name', () => {
      expect(source.name).toBe('PancakeSwap');
    });

    it('should support bsc chain', () => {
      expect(source.supportedChains).toEqual(['bsc']);
      expect(source.supportsChain('bsc')).toBe(true);
      expect(source.supportsChain('solana')).toBe(false);
    });

    it('should not require address', () => {
      expect(source.requiresAddress()).toBe(false);
    });
  });

  describe('getTokens', () => {
    it('should fetch tokens from popular pairs', async () => {
      const mockResponse = {
        data: {
          pairs: [
            {
              chainId: 'bsc',
              baseToken: { symbol: 'BNB', address: '0x123' },
              quoteToken: { symbol: 'USDT', address: '0x456' },
            },
          ],
        },
      };

      vi.mocked(pancakeClient.get).mockResolvedValue(mockResponse as any);

      const tokens = await source.getTokens();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should filter only BSC tokens', async () => {
      const mockResponse = {
        data: {
          pairs: [
            {
              chainId: 'bsc',
              baseToken: { symbol: 'BNB', address: '0x123' },
            },
            {
              chainId: 'solana',
              baseToken: { symbol: 'SOL', address: '0x789' },
            },
          ],
        },
      };

      vi.mocked(pancakeClient.get).mockResolvedValue(mockResponse as any);

      const tokens = await source.getTokens();
      expect(tokens.every((t) => t.chain === 'bsc')).toBe(true);
    });
  });

  describe('getPrice', () => {
    it('should fetch price successfully', async () => {
      const mockResponse = {
        data: {
          pairs: [
            {
              chainId: 'bsc',
              baseToken: { symbol: 'BNB' },
              priceUsd: '300.5',
            },
          ],
        },
      };

      vi.mocked(pancakeClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice('BNB');
      expect(price).not.toBeNull();
      expect(price?.price).toBe(300.5);
      expect(price?.source).toBe('pancakeswap');
    });

    it('should return null when price is invalid', async () => {
      const mockResponse = {
        data: {
          pairs: [
            {
              chainId: 'bsc',
              baseToken: { symbol: 'BNB' },
              priceUsd: '0',
            },
          ],
        },
      };

      vi.mocked(pancakeClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice('BNB');
      expect(price).toBeNull();
    });

    it('should return null when pair not found', async () => {
      const mockResponse = {
        data: {
          pairs: [],
        },
      };

      vi.mocked(pancakeClient.get).mockResolvedValue(mockResponse as any);

      const price = await source.getPrice('UNKNOWN');
      expect(price).toBeNull();
    });
  });
});

