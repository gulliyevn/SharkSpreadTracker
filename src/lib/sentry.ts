/**
 * Конфигурация Sentry для error tracking
 */

import * as Sentry from '@sentry/react';
import { logger } from '@/utils/logger';

/**
 * Инициализация Sentry
 * DSN берется из переменной окружения VITE_SENTRY_DSN
 * Если DSN не указан, Sentry не инициализируется (для dev окружения)
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  // Инициализируем только если DSN указан
  if (!dsn) {
    logger.debug('Sentry: DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Отключаем в dev режиме для уменьшения шума
    enabled: environment !== 'development',
  });

  logger.info(`Sentry initialized for environment: ${environment}`);
}

/**
 * Отправить ошибку в Sentry вручную
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): void {
  // Проверяем что Sentry инициализирован
  try {
    if (context) {
      Sentry.setContext('custom', context);
    }
    Sentry.captureException(error);
  } catch {
    // Игнорируем ошибки если Sentry не инициализирован
  }
}

/**
 * Отправить сообщение в Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void {
  try {
    Sentry.captureMessage(message, level);
  } catch {
    // Игнорируем ошибки если Sentry не инициализирован
  }
}

/**
 * Установить пользовательский контекст
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
}): void {
  try {
    Sentry.setUser(user);
  } catch {
    // Игнорируем ошибки если Sentry не инициализирован
  }
}

/**
 * Очистить пользовательский контекст
 */
export function clearUserContext(): void {
  try {
    Sentry.setUser(null);
  } catch {
    // Игнорируем ошибки если Sentry не инициализирован
  }
}
