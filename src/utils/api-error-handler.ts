/**
 * Централизованный обработчик ошибок API
 * Используется для единообразной обработки ошибок во всех API запросах
 */

import { ApiError, ValidationError, getErrorMessage } from './errors';
import { logger } from './logger';

export interface ApiErrorHandlerOptions {
  /**
   * Показывать ли детали ошибки в логах
   */
  logDetails?: boolean;
  /**
   * Функция для получения переводов (опционально)
   */
  t?: (key: string) => string;
  /**
   * Дополнительный контекст для логирования
   */
  context?: string;
}

/**
 * Обработать ошибку API и вернуть понятное сообщение
 */
export function handleApiError(
  error: unknown,
  options: ApiErrorHandlerOptions = {}
): string {
  const { logDetails = true, t, context } = options;

  // Логируем ошибку с контекстом
  if (logDetails) {
    const contextMsg = context ? `[${context}] ` : '';
    if (error instanceof ApiError) {
      logger.error(`${contextMsg}API Error:`, {
        statusCode: error.statusCode,
        message: error.message,
        details: error.details,
      });
    } else if (error instanceof ValidationError) {
      logger.error(`${contextMsg}Validation Error:`, {
        field: error.field,
        message: error.message,
      });
    } else if (error instanceof Error) {
      logger.error(`${contextMsg}Error:`, error.message, error.stack);
    } else {
      logger.error(`${contextMsg}Unknown error:`, error);
    }
  }

  // Возвращаем понятное сообщение для пользователя
  return getErrorMessage(error, t);
}

/**
 * Обернуть функцию API запроса с обработкой ошибок
 */
export function withErrorHandling<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, context?: string): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, { context });
      throw error; // Пробрасываем ошибку дальше для обработки в компонентах
    }
  }) as T;
}

/**
 * Создать обработчик ошибок для React Query
 */
export function createQueryErrorHandler(context?: string) {
  return (error: unknown) => {
    handleApiError(error, { context, logDetails: true });
  };
}
