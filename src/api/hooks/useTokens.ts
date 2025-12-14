import { useQuery } from '@tanstack/react-query';
import { getAllTokens } from '../endpoints/tokens.api';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { TokenWithData } from '../endpoints/tokens.api';

/**
 * React Query hook для получения всех токенов
 */
export function useTokens() {
  return useQuery<TokenWithData[]>({
    queryKey: ['tokens', 'all'],
    queryFn: getAllTokens,
    staleTime: REFRESH_INTERVALS.TOKENS,
    refetchInterval: REFRESH_INTERVALS.TOKENS,
    retry: 3,
    retryDelay: 1000,
  });
}

