import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Обёртка над QueryClientProvider для использования в корневом приложении.
 * Позволяет переиспользовать заранее сконфигурированный queryClient.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
