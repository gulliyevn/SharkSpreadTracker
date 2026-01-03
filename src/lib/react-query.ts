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
        // Получаем refetchInterval из query options с безопасной проверкой
        const options = query.options;
        if (!options || typeof options !== 'object') {
          return false;
        }

        const queryRefetchInterval =
          'refetchInterval' in options
            ? (options as { refetchInterval?: number | false }).refetchInterval
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

// ПРИМЕЧАНИЕ: React Query автоматически очищает кэш на основе gcTime (10 минут)
// Ручная очистка не требуется, но оставлена как дополнительная защита для edge cases
// Если нужно отключить, можно закомментировать код ниже

// Периодическая очистка старого кэша (каждые 10 минут - синхронизировано с gcTime)
// Это дополнительная защита на случай, если автоматическая очистка React Query не сработает
let cacheCleanupIntervalId: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  // Используем более редкую очистку (10 минут вместо 5) чтобы не дублировать работу React Query
  cacheCleanupIntervalId = setInterval(
    () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 минут (gcTime)

      let removedCount = 0;
      queries.forEach((query) => {
        const dataUpdatedAt = query.state.dataUpdatedAt || 0;
        // Удаляем только успешные запросы, которые старше maxAge и не используются
        if (
          now - dataUpdatedAt > maxAge &&
          query.state.status === 'success' &&
          query.state.fetchStatus !== 'fetching' &&
          query.getObserversCount() === 0 // Удаляем только если нет активных подписчиков
        ) {
          cache.remove(query);
          removedCount++;
        }
      });

      // Логируем только если что-то удалили (в dev режиме)
      if (removedCount > 0 && import.meta.env.DEV) {
        // Используем условный импорт чтобы не создавать циклические зависимости
        import('@/utils/logger').then(({ logger }) => {
          logger.debug(
            `[React Query] Cleaned up ${removedCount} old cache entries`
          );
        });
      }
    },
    10 * 60 * 1000 // Каждые 10 минут (синхронизировано с gcTime)
  );
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

// Очищаем интервал при закрытии страницы (предотвращение утечки памяти)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupCacheInterval();
  });
}
