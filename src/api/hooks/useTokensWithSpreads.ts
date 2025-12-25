import { useTokens } from './useTokens';

/**
 * Простой контейнер для токенов с ценами и спредами
 * Возвращает исходные данные от бэкенда без изменений
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
