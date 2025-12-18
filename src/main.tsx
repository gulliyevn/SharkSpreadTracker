import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './lib/i18n'; // Инициализация i18n
import { checkUrlForLeaks } from './utils/data-leak-prevention';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import { logger } from './utils/logger';
import App from './App';
import './styles/tailwind.css';

// Инициализация Sentry (error tracking)
initSentry();

// Инициализация аналитики
initAnalytics();

// Проверка на утечки данных при загрузке
checkUrlForLeaks();

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
    event.message?.includes('contentScript')
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
  if (
    event.reason?.stack?.includes('contentScript') ||
    event.reason?.stack?.includes('extension://') ||
    event.reason?.message?.includes('contentScript')
  ) {
    logger.warn('Browser extension promise rejection (ignored):', event.reason);
    event.preventDefault();
    return;
  }

  logger.error('Unhandled promise rejection:', event.reason);
});

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
