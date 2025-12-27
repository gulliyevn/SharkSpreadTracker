import { useQuery } from '@tanstack/react-query';
import { getSpreadData } from '../adapters/api-adapter';
import { REFRESH_INTERVALS } from '@/constants/api';
import { networkMonitor } from '@/utils/network-monitor';
import { useEffect, useState } from 'react';
import type { Token, SpreadResponse, TimeframeOption } from '@/types';

/**
 * React Query hook для получения данных спреда
 *
 * Автоматическое переподключение WebSocket:
 * - Использует refetchInterval для периодического обновления данных
 * - При каждом обновлении создается новое WebSocket соединение (request-response паттерн)
 * - Интервал адаптируется в зависимости от состояния сети
 *
 * @param token - Токен (symbol и chain)
 * @param timeframe - Таймфрейм для исторических данных
 * @param enabled - Включить/выключить запрос
 */
export function useSpreadData(
  token: Token | null,
  timeframe: TimeframeOption = '1h',
  enabled: boolean = true
) {
  const [refreshInterval, setRefreshInterval] = useState<number>(
    REFRESH_INTERVALS.SPREAD_DATA
  );

  // Адаптируем интервал обновления в зависимости от состояния сети
  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(() => {
      const recommendedInterval = networkMonitor.getRecommendedRefreshInterval(
        REFRESH_INTERVALS.SPREAD_DATA
      );
      setRefreshInterval(recommendedInterval);
    });

    // Устанавливаем начальный интервал
    const initialInterval = networkMonitor.getRecommendedRefreshInterval(
      REFRESH_INTERVALS.SPREAD_DATA
    );
    setRefreshInterval(initialInterval);

    return unsubscribe;
  }, []);

  return useQuery<SpreadResponse>({
    queryKey: ['spread', token?.symbol, token?.chain, timeframe],
    queryFn: ({ signal }) => {
      if (!token) {
        throw new Error('Token is required');
      }
      // При каждом вызове queryFn создается новое WebSocket соединение
      // Это реализует автоматическое переподключение для обновления данных
      return getSpreadData(token, timeframe, signal);
    },
    enabled: enabled && token !== null,
    staleTime: refreshInterval,
    // Автоматическое переподключение через периодический refetch
    // При каждом refetch создается новое WebSocket соединение
    refetchInterval: enabled ? refreshInterval : false,
    retry: 3,
    retryDelay: 1000,
  });
}
