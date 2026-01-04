import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/constants/api';
import { trackThemeChange } from '@/lib/analytics';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Получить системную тему
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    // Если matchMedia недоступен (например, в некоторых тестовых окружениях), возвращаем 'dark'
    return 'dark';
  }
}

/**
 * Применить тему к документу
 * Tailwind использует darkMode: 'class', поэтому для светлой темы просто удаляем класс 'dark'
 */
function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>(
    STORAGE_KEYS.THEME,
    'system'
  );
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    storedTheme === 'system' ? getSystemTheme() : storedTheme
  );

  // Применить тему при загрузке
  useEffect(() => {
    const theme = storedTheme === 'system' ? getSystemTheme() : storedTheme;
    applyTheme(theme);
    setResolvedTheme(theme);
  }, [storedTheme]);

  // Слушать изменения системной темы
  useEffect(() => {
    if (storedTheme !== 'system' || typeof window === 'undefined') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
        setResolvedTheme(newTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } catch {
      // Если matchMedia недоступен, просто возвращаемся без подписки
      return;
    }
  }, [storedTheme]);

  const setTheme = (theme: Theme) => {
    setStoredTheme(theme);
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved);
    setResolvedTheme(resolved);
    // Трекинг смены темы
    if (resolved === 'light' || resolved === 'dark') {
      trackThemeChange(resolved);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: storedTheme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Хук для использования темы
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
