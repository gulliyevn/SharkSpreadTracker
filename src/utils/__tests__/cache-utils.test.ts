import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Мокаем queryClient
vi.mock('@/lib/react-query', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
    clear: vi.fn(),
    prefetchQuery: vi.fn().mockResolvedValue(undefined),
    getQueryCache: vi.fn().mockReturnValue({
      getAll: vi.fn().mockReturnValue([]),
      remove: vi.fn(),
    }),
  },
}));

// Мокаем logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  invalidateTokensCache,
  invalidateTokenCache,
  invalidateSpreadsCache,
  invalidateSpreadCache,
  invalidatePricesCache,
  clearAllCache,
  prefetchTokens,
  getCacheSize,
  cleanupOldCache,
} from '../cache-utils';
import { queryClient } from '@/lib/react-query';

describe('cache-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('invalidateTokensCache', () => {
    it('should invalidate tokens cache', () => {
      invalidateTokensCache();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tokens'] });
    });
  });

  describe('invalidateTokenCache', () => {
    it('should invalidate specific token cache', () => {
      invalidateTokenCache('BTC', 'solana');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['tokens', 'BTC', 'solana'],
      });
    });
  });

  describe('invalidateSpreadsCache', () => {
    it('should invalidate spreads cache', () => {
      invalidateSpreadsCache();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['spread'] });
    });
  });

  describe('invalidateSpreadCache', () => {
    it('should invalidate specific spread cache without timeframe', () => {
      invalidateSpreadCache('ETH', 'bsc');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['spread', 'ETH', 'bsc'],
      });
    });

    it('should invalidate specific spread cache with timeframe', () => {
      invalidateSpreadCache('ETH', 'bsc', '1h');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['spread', 'ETH', 'bsc', '1h'],
      });
    });
  });

  describe('invalidatePricesCache', () => {
    it('should invalidate prices cache', () => {
      invalidatePricesCache();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['prices'] });
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', () => {
      clearAllCache();
      expect(queryClient.clear).toHaveBeenCalled();
    });
  });

  describe('prefetchTokens', () => {
    it('should prefetch tokens', async () => {
      await prefetchTokens();
      expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['tokens', 'all'],
          staleTime: expect.any(Number),
        })
      );
    });

    it('should handle prefetch errors gracefully', async () => {
      vi.mocked(queryClient.prefetchQuery).mockRejectedValueOnce(new Error('Network error'));
      
      // Should not throw
      await expect(prefetchTokens()).resolves.toBeUndefined();
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      const size = getCacheSize();
      expect(size).toBe(0);
    });

    it('should calculate size of cached data', () => {
      const mockData = { foo: 'bar', count: 123 };
      vi.mocked(queryClient.getQueryCache).mockReturnValueOnce({
        getAll: () => [{ state: { data: mockData } }],
        remove: vi.fn(),
      } as never);

      const size = getCacheSize();
      expect(size).toBe(JSON.stringify(mockData).length);
    });

    it('should handle serialization errors', () => {
      const circularObj: Record<string, unknown> = {};
      circularObj.self = circularObj;

      vi.mocked(queryClient.getQueryCache).mockReturnValueOnce({
        getAll: () => [{ state: { data: circularObj } }],
        remove: vi.fn(),
      } as never);

      // Should not throw, returns 0
      const size = getCacheSize();
      expect(size).toBe(0);
    });
  });

  describe('cleanupOldCache', () => {
    it('should cleanup old cache entries', () => {
      const removeMock = vi.fn();
      const oldQuery = {
        state: {
          dataUpdatedAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
          status: 'success',
        },
      };

      vi.mocked(queryClient.getQueryCache).mockReturnValueOnce({
        getAll: () => [oldQuery],
        remove: removeMock,
      } as never);

      cleanupOldCache();
      expect(removeMock).toHaveBeenCalledWith(oldQuery);
    });

    it('should not remove recent cache entries', () => {
      const removeMock = vi.fn();
      const recentQuery = {
        state: {
          dataUpdatedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          status: 'success',
        },
      };

      vi.mocked(queryClient.getQueryCache).mockReturnValueOnce({
        getAll: () => [recentQuery],
        remove: removeMock,
      } as never);

      cleanupOldCache();
      expect(removeMock).not.toHaveBeenCalled();
    });
  });
});
