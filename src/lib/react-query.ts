import { QueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/constants/api';

/**
 * Конфигурация React Query
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5 секунд
      gcTime: 10 * 60 * 1000, // 10 минут (было cacheTime)
      retry: API_CONFIG.RETRY_ATTEMPTS,
      retryDelay: (attemptIndex) => {
        // Экспоненциальная задержка: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

