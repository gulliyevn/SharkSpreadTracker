import { useQuery } from '@tanstack/react-query';
import { getAllTokens } from '../adapters/api-adapter';
import { REFRESH_INTERVALS } from '@/constants/api';
import type { StraightData } from '@/types';

/**
 * React Query hook для получения всех токенов
 *
 * Возвращает исходные данные от бэкенда без изменений.
 * Автоматически кэширует данные и управляет состоянием загрузки.
 *
 * @returns Объект с данными токенов, состоянием загрузки, ошибками и функцией refetch
 *
 * @example
 * ```tsx
 * function TokensList() {
 *   const { data: tokens, isLoading, error, refetch } = useTokens();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {tokens?.map(token => (
 *         <div key={token.token}>{token.token}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
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
