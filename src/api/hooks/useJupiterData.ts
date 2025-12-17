import { useQuery } from '@tanstack/react-query';
import { getJupiterPrice } from '../endpoints/prices.api';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { TokenPrice } from '../endpoints/prices.api';

/**
 * React Query hook для получения цены из Jupiter
 * @param symbol - Символ токена
 * @param address - Адрес токена (опционально)
 * @param enabled - Включить/выключить запрос
 */
export function useJupiterData(
  symbol: string | null,
  address?: string,
  enabled: boolean = true
) {
  return useQuery<TokenPrice | null>({
    queryKey: ['jupiter', 'price', symbol, address],
    queryFn: ({ signal }) => {
      if (!symbol) {
        throw new Error('Symbol is required');
      }
      return getJupiterPrice(symbol, address, signal);
    },
    enabled: enabled && symbol !== null,
    staleTime: REFRESH_INTERVALS.SPREAD_DATA,
    refetchInterval: REFRESH_INTERVALS.SPREAD_DATA,
    retry: 3,
    retryDelay: 1000,
  });
}
