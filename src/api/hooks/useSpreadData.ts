import { useQuery } from '@tanstack/react-query';
import { getSpreadData } from '../endpoints/spreads.api';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { Token, SpreadResponse, TimeframeOption } from '@/types';

/**
 * React Query hook для получения данных спреда
 * @param token - Токен (symbol и chain)
 * @param timeframe - Таймфрейм для исторических данных
 * @param enabled - Включить/выключить запрос
 */
export function useSpreadData(
  token: Token | null,
  timeframe: TimeframeOption = '1h',
  enabled: boolean = true
) {
  return useQuery<SpreadResponse>({
    queryKey: ['spread', token?.symbol, token?.chain, timeframe],
    queryFn: () => {
      if (!token) {
        throw new Error('Token is required');
      }
      return getSpreadData(token, timeframe);
    },
    enabled: enabled && token !== null,
    staleTime: REFRESH_INTERVALS.SPREAD_DATA,
    refetchInterval: REFRESH_INTERVALS.SPREAD_DATA,
    retry: 3,
    retryDelay: 1000,
  });
}
