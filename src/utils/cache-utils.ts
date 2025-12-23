/**
 * Утилиты для управления кэшем React Query
 */

import { queryClient } from '@/lib/react-query';
import { logger } from './logger';

/**
 * Инвалидировать кэш для всех токенов
 */
export function invalidateTokensCache(): void {
  queryClient.invalidateQueries({ queryKey: ['tokens'] });
  logger.debug('Tokens cache invalidated');
}

/**
 * Инвалидировать кэш для конкретного токена
 */
export function invalidateTokenCache(symbol: string, chain: string): void {
  queryClient.invalidateQueries({ queryKey: ['tokens', symbol, chain] });
  logger.debug(`Token cache invalidated: ${symbol}-${chain}`);
}

/**
 * Инвалидировать кэш для спредов
 */
export function invalidateSpreadsCache(): void {
  queryClient.invalidateQueries({ queryKey: ['spread'] });
  logger.debug('Spreads cache invalidated');
}

/**
 * Инвалидировать кэш для конкретного спреда
 */
export function invalidateSpreadCache(
  symbol: string,
  chain: string,
  timeframe?: string
): void {
  const queryKey = timeframe
    ? ['spread', symbol, chain, timeframe]
    : ['spread', symbol, chain];
  queryClient.invalidateQueries({ queryKey });
  logger.debug(
    `Spread cache invalidated: ${symbol}-${chain}${timeframe ? `-${timeframe}` : ''}`
  );
}

/**
 * Инвалидировать кэш для цен
 */
export function invalidatePricesCache(): void {
  queryClient.invalidateQueries({ queryKey: ['prices'] });
  logger.debug('Prices cache invalidated');
}

/**
 * Очистить весь кэш React Query
 */
export function clearAllCache(): void {
  queryClient.clear();
  logger.info('All React Query cache cleared');
}

/**
 * Предзагрузить данные в кэш
 */
export async function prefetchTokens(): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: ['tokens', 'all'],
      queryFn: async ({ signal }) => {
        const { getAllTokens } = await import('@/api/adapters/api-adapter');
        return getAllTokens(signal);
      },
      staleTime: 2 * 60 * 1000, // 2 минуты
    });
    logger.debug('Tokens prefetched');
  } catch (error) {
    logger.error('Failed to prefetch tokens:', error);
  }
}

/**
 * Получить размер кэша (приблизительно)
 */
export function getCacheSize(): number {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  let size = 0;

  queries.forEach((query) => {
    const data = query.state.data;
    if (data) {
      try {
        size += JSON.stringify(data).length;
      } catch {
        // Игнорируем ошибки сериализации
      }
    }
  });

  return size;
}

/**
 * Очистить старые записи из кэша (старше чем gcTime)
 */
export function cleanupOldCache(): void {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 минут (gcTime)

  queries.forEach((query) => {
    const dataUpdatedAt = query.state.dataUpdatedAt || 0;
    if (now - dataUpdatedAt > maxAge && query.state.status === 'success') {
      cache.remove(query);
    }
  });

  logger.debug(`Cleaned up old cache entries`);
}
