import { useQuery } from '@tanstack/react-query';
import { getPancakePrice } from '../endpoints/prices.api';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { TokenPrice } from '../endpoints/prices.api';

/**
 * React Query hook для получения цены из PancakeSwap
 * @param symbol - Символ токена
 * @param enabled - Включить/выключить запрос
 */
export function usePancakeData(symbol: string | null, enabled: boolean = true) {
  return useQuery<TokenPrice | null>({
    queryKey: ['pancakeswap', 'price', symbol],
    queryFn: ({ signal }) => {
      if (!symbol) {
        throw new Error('Symbol is required');
      }
      return getPancakePrice(symbol, signal);
    },
    enabled: enabled && symbol !== null,
    staleTime: REFRESH_INTERVALS.SPREAD_DATA,
    refetchInterval: REFRESH_INTERVALS.SPREAD_DATA,
    retry: 3,
    retryDelay: 1000,
  });
}
