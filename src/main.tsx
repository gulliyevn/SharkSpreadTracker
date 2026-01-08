// Инициализация темы ДО импорта React для избежания мигания
import { initTheme } from '@/utils/theme-init';
initTheme();

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import '@/lib/i18n'; // Инициализация i18n
import { checkUrlForLeaks } from '@/utils/data-leak-prevention';
import { initSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { initWebVitals } from '@/lib/web-vitals';
import { logger } from '@/utils/logger';
// Инициализируем IndexedDB при загрузке приложения
import '@/utils/indexeddb';
import App from '@/App';
import '@/styles/tailwind.css';
import { wsConnectionManager } from '@/api/adapters/websocket-connection-manager';

// Инициализация Sentry (error tracking)
initSentry();

// Инициализация аналитики
initAnalytics();

// Инициализация Web Vitals мониторинга (только в production)
initWebVitals();

// Проверка на утечки данных при загрузке
checkUrlForLeaks();

// Backend-only mode: API keys validation removed
// All data is now fetched from backend, no direct API calls

// Глобальный обработчик ошибок для перехвата ошибок из расширений браузера
// и других источников, которые не попадают в React ErrorBoundary
window.addEventListener('error', (event) => {
  // Игнорируем ошибки из расширений браузера (content scripts)
  // Они не должны блокировать работу приложения
  if (
    event.filename?.includes('contentScript') ||
    event.filename?.includes('extension://') ||
    event.filename?.includes('chrome-extension://') ||
    event.filename?.includes('moz-extension://') ||
    event.message?.includes('contentScript') ||
    event.message?.includes('inpage.js') ||
    event.message?.includes('IN_PAGE_CHANNEL_NODE_ID') ||
    event.message?.includes('in-page-channel-node-id')
  ) {
    logger.warn(
      'Browser extension error detected (ignored):',
      event.message,
      event.filename
    );
    // Не блокируем выполнение, но логируем для отладки
    event.preventDefault();
    return;
  }

  // Для других ошибок логируем, но не блокируем
  logger.error('Global error:', event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Обработчик необработанных промисов
window.addEventListener('unhandledrejection', (event) => {
  // Игнорируем ошибки из расширений
  const reason = event.reason;
  const errorMessage =
    reason?.message || reason?.toString() || String(reason || '');
  const errorStack = reason?.stack || '';

  if (
    errorStack.includes('contentScript') ||
    errorStack.includes('extension://') ||
    errorMessage.includes('contentScript') ||
    errorMessage.includes('inpage.js') ||
    errorMessage.includes('IN_PAGE_CHANNEL_NODE_ID') ||
    errorMessage.includes('in-page-channel-node-id')
  ) {
    logger.warn('Browser extension promise rejection (ignored):', event.reason);
    event.preventDefault();
    return;
  }

  logger.error('Unhandled promise rejection:', event.reason);
});

// Очистка WebSocket соединений при закрытии страницы или unmount
const cleanup = () => {
  try {
    logger.info('[Main] Cleaning up WebSocket connections...');
    wsConnectionManager.disconnect();
  } catch (error) {
    logger.error('[Main] Error during cleanup:', error);
  }
};

// Очищаем соединения при закрытии страницы
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);

  // Очищаем при hot reload в development
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanup();
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </QueryClientProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
