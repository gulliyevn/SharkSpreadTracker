/**
 * Утилиты для обработки rate limiting (429 ошибок)
 */

import { ApiError } from './errors';
import { logger } from './logger';

/**
 * Интерфейс для информации о rate limit
 */
export interface RateLimitInfo {
  /**
   * Время в миллисекундах до следующего разрешенного запроса
   */
  retryAfter: number;
  /**
   * Максимальное количество запросов в окне
   */
  limit?: number;
  /**
   * Оставшееся количество запросов в окне
   */
  remaining?: number;
  /**
   * Время сброса окна (timestamp)
   */
  resetAt?: number;
}

/**
 * Извлечь информацию о rate limit из заголовков ответа
 */
export function extractRateLimitInfo(response: Response): RateLimitInfo | null {
  const retryAfter = response.headers.get('Retry-After');
  const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
  const rateLimitReset = response.headers.get('X-RateLimit-Reset');

  // Если нет Retry-After, используем дефолтное значение
  let retryAfterMs = 1000; // 1 секунда по умолчанию

  if (retryAfter) {
    const retryAfterNum = parseInt(retryAfter, 10);
    if (!isNaN(retryAfterNum)) {
      // Retry-After может быть в секундах или timestamp
      if (retryAfterNum > 1000000000) {
        // Это timestamp (Unix epoch)
        retryAfterMs = Math.max(0, retryAfterNum * 1000 - Date.now());
      } else {
        // Это секунды
        retryAfterMs = retryAfterNum * 1000;
      }
    }
  }

  const info: RateLimitInfo = {
    retryAfter: retryAfterMs,
  };

  if (rateLimitLimit) {
    const limit = parseInt(rateLimitLimit, 10);
    if (!isNaN(limit)) {
      info.limit = limit;
    }
  }

  if (rateLimitRemaining) {
    const remaining = parseInt(rateLimitRemaining, 10);
    if (!isNaN(remaining)) {
      info.remaining = remaining;
    }
  }

  if (rateLimitReset) {
    const reset = parseInt(rateLimitReset, 10);
    if (!isNaN(reset)) {
      // Может быть timestamp в секундах или миллисекундах
      info.resetAt = reset > 1000000000000 ? reset : reset * 1000;
    }
  }

  return info;
}

/**
 * Проверить, является ли ошибка rate limit ошибкой (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 429;
  }
  return false;
}

/**
 * Вычислить задержку для exponential backoff
 * @param attemptNumber - Номер попытки (начинается с 0)
 * @param baseDelay - Базовая задержка в миллисекундах (по умолчанию 1000ms)
 * @param maxDelay - Максимальная задержка в миллисекундах (по умолчанию 30000ms)
 * @param retryAfter - Время из заголовка Retry-After (если есть)
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  retryAfter?: number
): number {
  // Если есть Retry-After из заголовка, используем его
  if (retryAfter !== undefined && retryAfter > 0) {
    return Math.min(retryAfter, maxDelay);
  }

  // Exponential backoff: baseDelay * 2^attemptNumber
  const delay = baseDelay * Math.pow(2, attemptNumber);
  return Math.min(delay, maxDelay);
}

/**
 * Выполнить запрос с автоматическим exponential backoff при 429 ошибках
 * @param requestFn - Функция для выполнения запроса
 * @param maxRetries - Максимальное количество попыток (по умолчанию 3)
 * @param baseDelay - Базовая задержка для exponential backoff (по умолчанию 1000ms)
 */
export async function withRateLimitRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  let retryAfter: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Если это не rate limit ошибка, пробрасываем сразу
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Если это последняя попытка, пробрасываем ошибку
      if (attempt >= maxRetries) {
        logger.warn(
          `[RateLimit] Max retries (${maxRetries}) reached for rate limit error`
        );
        throw error;
      }

      // Извлекаем информацию о rate limit из ошибки
      if (error instanceof ApiError && error.details) {
        const details = error.details as { response?: Response };
        if (details.response) {
          const rateLimitInfo = extractRateLimitInfo(details.response);
          if (rateLimitInfo) {
            retryAfter = rateLimitInfo.retryAfter;
          }
        }
      }

      // Вычисляем задержку
      const delay = calculateBackoffDelay(
        attempt,
        baseDelay,
        30000,
        retryAfter
      );

      logger.warn(
        `[RateLimit] Rate limit error (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
      );

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Этот код не должен выполниться, но TypeScript требует return
  throw lastError;
}
