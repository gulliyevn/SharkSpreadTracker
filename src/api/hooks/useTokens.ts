import { useQuery } from '@tanstack/react-query';
import { getAllTokens } from '../adapters/api-adapter';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { TokenWithData } from '@/types';

/**
 * React Query hook для получения всех токенов
 */
export function useTokens() {
  return useQuery<TokenWithData[]>({
    queryKey: ['tokens', 'all'],
    queryFn: async ({ signal }) => {
      return getAllTokens(signal);
    },
    staleTime: REFRESH_INTERVALS.TOKENS,
    refetchInterval: REFRESH_INTERVALS.TOKENS,
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
