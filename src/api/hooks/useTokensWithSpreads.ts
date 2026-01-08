import { useTokens } from './useTokens';

/**
 * React Query hook для получения токенов с ценами и спредами
 *
 * Обертка над useTokens, предоставляющая удобный интерфейс для работы с токенами.
 * Возвращает исходные данные от бэкенда без изменений.
 *
 * @returns Объект с данными токенов, состоянием загрузки, ошибками, счетчиками и функцией refetch
 *
 * @example
 * ```tsx
 * function TokensList() {
 *   const { data: tokens, isLoading, loadedCount, totalCount } = useTokensWithSpreads();
 *
 *   return (
 *     <div>
 *       <p>Loaded: {loadedCount} / {totalCount}</p>
 *       {tokens.map(token => (
 *         <TokenCard key={token.token} token={token} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTokensWithSpreads() {
  const { data: tokens = [], isLoading, error, refetch } = useTokens();

  return {
    data: tokens,
    isLoading,
    error,
    loadedCount: tokens.length,
    totalCount: tokens.length,
    refetch,
  };
}
