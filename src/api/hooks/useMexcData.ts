import { useQuery } from '@tanstack/react-query';
import { getMexcPrice } from '../endpoints/prices.api';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { TokenPrice } from '../endpoints/prices.api';

/**
 * React Query hook для получения цены из MEXC
 * @param symbol - Символ токена (например, 'BTCUSDT')
 * @param enabled - Включить/выключить запрос
 */
export function useMexcData(symbol: string | null, enabled: boolean = true) {
  return useQuery<TokenPrice | null>({
    queryKey: ['mexc', 'price', symbol],
    queryFn: () => {
      if (!symbol) {
        throw new Error('Symbol is required');
      }
      return getMexcPrice(symbol);
    },
    enabled: enabled && symbol !== null,
    staleTime: REFRESH_INTERVALS.SPREAD_DATA,
    refetchInterval: REFRESH_INTERVALS.SPREAD_DATA,
    retry: 3,
    retryDelay: 1000,
  });
}
