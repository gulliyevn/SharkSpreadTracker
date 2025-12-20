import { useQuery } from '@tanstack/react-query';
import { getAllTokens } from '../endpoints/tokens.api';
import { REFRESH_INTERVALS } from '@/constants/api';
import { networkMonitor } from '@/utils/network-monitor';
import { useEffect, useState } from 'react';
import type { TokenWithData } from '../endpoints/tokens.api';

/**
 * React Query hook для получения всех токенов
 */
export function useTokens() {
  const [refreshInterval, setRefreshInterval] = useState<number>(REFRESH_INTERVALS.TOKENS);

  // Адаптируем интервал обновления в зависимости от состояния сети
  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(() => {
      const recommendedInterval = networkMonitor.getRecommendedRefreshInterval(
        REFRESH_INTERVALS.TOKENS
      );
      setRefreshInterval(recommendedInterval);
    });

    // Устанавливаем начальный интервал
    const initialInterval = networkMonitor.getRecommendedRefreshInterval(
      REFRESH_INTERVALS.TOKENS
    );
    setRefreshInterval(initialInterval);

    return unsubscribe;
  }, []);

  return useQuery<TokenWithData[]>({
    queryKey: ['tokens', 'all'],
    queryFn: ({ signal }) => getAllTokens(signal),
    staleTime: refreshInterval,
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: 1000,
  });
}
