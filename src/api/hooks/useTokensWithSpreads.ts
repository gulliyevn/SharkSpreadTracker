import { useTokens } from './useTokens';

/**
 * Простой контейнер для токенов с ценами и спредами
 */
export function useTokensWithSpreads() {
  const { data: tokens = [], isLoading, error, refetch } = useTokens();

  return {
    data: tokens,
    isLoading,
    error,
    loadedCount: tokens.length,
    totalCount: tokens.length,
    refetch,
  };
}
