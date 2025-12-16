import type { ReactNode } from 'react';
import { ThemeProvider as BaseThemeProvider } from '@/contexts/ThemeContext';

interface AppThemeProviderProps {
  children: ReactNode;
}

/**
 * Обёртка над ThemeProvider из контекста.
 * Используется для единообразия с QueryProvider и будущими провайдерами.
 */
export function ThemeProvider({ children }: AppThemeProviderProps) {
  return <BaseThemeProvider>{children}</BaseThemeProvider>;
}


