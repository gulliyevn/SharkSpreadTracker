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
      retry: (failureCount, error) => {
        // Не повторяем запросы для 429 (rate limit) - они обрабатываются отдельно
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 429) {
            return false; // Не повторяем 429 ошибки автоматически
          }
        }
        // Для других ошибок используем стандартную логику
        return failureCount < API_CONFIG.RETRY_ATTEMPTS;
      },
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
// Ручная очистка была удалена, так как она избыточна - React Query делает это автоматически
// Если в будущем понадобится дополнительная очистка, можно добавить обратно
