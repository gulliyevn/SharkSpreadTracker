import { useQuery } from '@tanstack/react-query';
import { getAllTokens } from '../adapters/api-adapter';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { StraightData } from '@/types';

/**
 * React Query hook для получения всех токенов
 * Возвращает исходные данные от бэкенда без изменений
 */
export function useTokens() {
  return useQuery<StraightData[]>({
    queryKey: ['tokens', 'all'],
    queryFn: async ({ signal }) => {
      return getAllTokens(signal);
    },
    staleTime: REFRESH_INTERVALS.TOKENS,
    // refetchInterval отключен - автообновление управляется через кнопку Auto в UI
    refetchInterval: false,
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
