import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import { logger } from '../logger';

vi.mock('@/lib/react-query', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
    clear: vi.fn(),
    prefetchQuery: vi.fn(),
    getQueryCache: vi.fn(() => ({
      getAll: vi.fn(() => []),
      remove: vi.fn(),
    })),
  },
}));

vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('cache-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invalidateTokensCache', () => {
    it('should invalidate tokens cache', () => {
      invalidateTokensCache();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['tokens'],
      });
      expect(logger.debug).toHaveBeenCalledWith('Tokens cache invalidated');
    });
  });

  describe('invalidateTokenCache', () => {
    it('should invalidate specific token cache', () => {
      invalidateTokenCache('BTC', 'solana');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['tokens', 'BTC', 'solana'],
      });
      expect(logger.debug).toHaveBeenCalledWith('Token cache invalidated: BTC-solana');
    });
  });

  describe('invalidateSpreadsCache', () => {
    it('should invalidate spreads cache', () => {
      invalidateSpreadsCache();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['spread'],
      });
      expect(logger.debug).toHaveBeenCalledWith('Spreads cache invalidated');
    });
  });

  describe('invalidateSpreadCache', () => {
    it('should invalidate spread cache without timeframe', () => {
      invalidateSpreadCache('BTC', 'solana');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['spread', 'BTC', 'solana'],
      });
      expect(logger.debug).toHaveBeenCalledWith('Spread cache invalidated: BTC-solana');
    });

    it('should invalidate spread cache with timeframe', () => {
      invalidateSpreadCache('BTC', 'solana', '1h');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['spread', 'BTC', 'solana', '1h'],
      });
      expect(logger.debug).toHaveBeenCalledWith('Spread cache invalidated: BTC-solana-1h');
    });
  });

  describe('invalidatePricesCache', () => {
    it('should invalidate prices cache', () => {
      invalidatePricesCache();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['prices'],
      });
      expect(logger.debug).toHaveBeenCalledWith('Prices cache invalidated');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', () => {
      clearAllCache();
      expect(queryClient.clear).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('All React Query cache cleared');
    });
  });

  describe('prefetchTokens', () => {
    it('should prefetch tokens successfully', async () => {
      vi.mocked(queryClient.prefetchQuery).mockResolvedValue(undefined);

      await prefetchTokens();

      expect(queryClient.prefetchQuery).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Tokens prefetched');
    });

    it('should handle prefetch errors', async () => {
      const error = new Error('Prefetch failed');
      vi.mocked(queryClient.prefetchQuery).mockRejectedValue(error);

      await prefetchTokens();

      expect(logger.error).toHaveBeenCalledWith('Failed to prefetch tokens:', error);
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      const mockCache = {
        getAll: vi.fn(() => []),
      };
      vi.mocked(queryClient.getQueryCache).mockReturnValue(mockCache as any);

      const size = getCacheSize();
      expect(size).toBe(0);
    });

    it('should calculate cache size', () => {
      const mockQueries = [
        { state: { data: { test: 'data1' } } },
        { state: { data: { test: 'data2' } } },
      ];
      const mockCache = {
        getAll: vi.fn(() => mockQueries),
      };
      vi.mocked(queryClient.getQueryCache).mockReturnValue(mockCache as any);

      const size = getCacheSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should handle serialization errors', () => {
      const circularData: any = { test: 'data' };
      circularData.self = circularData; // Создаем циклическую ссылку
      
      const mockQueries = [
        { state: { data: circularData } },
      ];
      const mockCache = {
        getAll: vi.fn(() => mockQueries),
      };
      vi.mocked(queryClient.getQueryCache).mockReturnValue(mockCache as any);

      // Не должно выбросить ошибку
      expect(() => getCacheSize()).not.toThrow();
    });
  });

  describe('cleanupOldCache', () => {
    it('should cleanup old cache entries', () => {
      const now = Date.now();
      const oldQuery = {
        state: {
          status: 'success' as const,
          dataUpdatedAt: now - 11 * 60 * 1000, // 11 минут назад
        },
      };
      const newQuery = {
        state: {
          status: 'success' as const,
          dataUpdatedAt: now - 5 * 60 * 1000, // 5 минут назад
        },
      };

      const mockCache = {
        getAll: vi.fn(() => [oldQuery, newQuery]),
        remove: vi.fn(),
      };
      vi.mocked(queryClient.getQueryCache).mockReturnValue(mockCache as any);

      cleanupOldCache();

      expect(mockCache.remove).toHaveBeenCalledWith(oldQuery);
      expect(mockCache.remove).not.toHaveBeenCalledWith(newQuery);
      expect(logger.debug).toHaveBeenCalledWith('Cleaned up old cache entries');
    });

    it('should cleanup queries with dataUpdatedAt = 0 (treated as old)', () => {
      const query = {
        state: {
          status: 'success' as const,
          dataUpdatedAt: 0, // 0 означает что нет данных, но код использует || 0, так что это старый запрос
        },
      };

      const mockCache = {
        getAll: vi.fn(() => [query]),
        remove: vi.fn(),
      };
      vi.mocked(queryClient.getQueryCache).mockReturnValue(mockCache as any);

      cleanupOldCache();

      // dataUpdatedAt = 0 означает что now - 0 = now, что всегда > maxAge, поэтому удаляется
      expect(mockCache.remove).toHaveBeenCalledWith(query);
    });

    it('should not cleanup non-success queries', () => {
      const query = {
        state: {
          status: 'error' as const,
          dataUpdatedAt: Date.now() - 15 * 60 * 1000,
        },
      };

      const mockCache = {
        getAll: vi.fn(() => [query]),
        remove: vi.fn(),
      };
      vi.mocked(queryClient.getQueryCache).mockReturnValue(mockCache as any);

      cleanupOldCache();

      expect(mockCache.remove).not.toHaveBeenCalled();
    });
  });
});

