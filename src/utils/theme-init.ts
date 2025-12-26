/**
 * Инициализация темы - должна выполняться синхронно до рендера React
 * Используется вместо inline script для соответствия CSP
 */

/**
 * Применяет тему из localStorage синхронно
 * Вызывается до рендера React для избежания мигания
 */
export function initTheme(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const theme = localStorage.getItem('shark_theme') || 'system';
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light';
    const resolvedTheme = theme === 'system' ? systemTheme : theme;

    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    // Если localStorage недоступен (например, в приватном режиме), игнорируем ошибку
    // По умолчанию будет использоваться системная тема
    console.warn('[theme-init] Failed to apply theme:', error);
  }
}
