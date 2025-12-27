import { QueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/constants/api';

/**
 * Конфигурация React Query
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 секунд (было 5 секунд) - данные считаются свежими 30 сек
      gcTime: 10 * 60 * 1000, // 10 минут (время хранения в кэше)
      retry: API_CONFIG.RETRY_ATTEMPTS,
      retryDelay: (attemptIndex) => {
        // Экспоненциальная задержка: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      refetchOnWindowFocus: false, // Отключено для снижения нагрузки
      refetchOnReconnect: true, // Перезагружаем при восстановлении соединения
      // Адаптивный refetch - уменьшает частоту для неактивных вкладок
      refetchInterval: (query) => {
        // Получаем refetchInterval из query state или options
        const queryRefetchInterval =
          query.state.dataUpdatedAt && 'refetchInterval' in query.options
            ? (query.options as { refetchInterval?: number | false })
                .refetchInterval
            : undefined;

        if (queryRefetchInterval && typeof queryRefetchInterval === 'number') {
          const isPageVisible = document.visibilityState === 'visible';
          if (!isPageVisible) {
            // Для неактивных вкладок увеличиваем интервал в 5 раз
            return queryRefetchInterval * 5;
          }
          return queryRefetchInterval;
        }
        return false;
      },
    },
    mutations: {
      retry: 1,
      // Инвалидируем кэш после успешных мутаций
      onSuccess: () => {
        // Автоматическая инвалидация будет настроена в конкретных мутациях
      },
    },
  },
});

// Периодическая очистка старого кэша (каждые 5 минут)
// Сохраняем ID интервала для возможности очистки
let cacheCleanupIntervalId: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  cacheCleanupIntervalId = setInterval(
    () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 минут (gcTime)

      queries.forEach((query) => {
        const dataUpdatedAt = query.state.dataUpdatedAt || 0;
        // Удаляем только успешные запросы, которые старше maxAge
        if (
          now - dataUpdatedAt > maxAge &&
          query.state.status === 'success' &&
          query.state.fetchStatus !== 'fetching'
        ) {
          cache.remove(query);
        }
      });
    },
    5 * 60 * 1000
  ); // Каждые 5 минут
}

/**
 * Очистить интервал периодической очистки кэша
 * Вызывается при unmount приложения или hot reload
 */
export function cleanupCacheInterval(): void {
  if (cacheCleanupIntervalId !== null) {
    clearInterval(cacheCleanupIntervalId);
    cacheCleanupIntervalId = null;
  }
}

// Очищаем интервал при hot reload в development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupCacheInterval();
  });
}
