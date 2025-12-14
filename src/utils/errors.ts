/**
 * Утилиты для обработки ошибок
 */

/**
 * Кастомный класс ошибки API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Кастомный класс ошибки валидации
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Получить ключ перевода для ошибки API
 */
export function getApiErrorTranslationKey(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        return 'api.errors.invalidKey';
      case 403:
        return 'api.errors.forbidden';
      case 404:
        return 'api.errors.notFound';
      case 429:
        return 'api.errors.tooManyRequests';
      case 500:
      case 502:
      case 503:
        return 'api.errors.serverError';
      default:
        return 'api.errors.unknown';
    }
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'api.errors.networkError';
    }
    if (error.message.includes('timeout')) {
      return 'api.errors.timeout';
    }
    return error.message;
  }

  return 'api.errors.unknown';
}

/**
 * Получить понятное пользователю сообщение об ошибке
 * @param error - Ошибка
 * @param t - Функция перевода из useTranslation (опционально)
 */
export function getErrorMessage(
  error: unknown,
  t?: (key: string) => string
): string {
  const key = getApiErrorTranslationKey(error);

  // Если передана функция перевода, используем её
  if (t) {
    return t(key);
  }

  // Fallback на английский
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        return 'Invalid API key. Please check the key.';
      case 403:
        return 'Access denied. Check your permissions.';
      case 404:
        return 'Data not found.';
      case 429:
        return 'Too many requests. Please wait a bit.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An error occurred while requesting the server.';
    }
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Network connection problem. Check your connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timeout exceeded. Please try again.';
    }
    return error.message;
  }

  return 'An unknown error occurred.';
}

/**
 * Проверить, является ли ошибка сетевой ошибкой
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch')
    );
  }
  return false;
}

/**
 * Проверить, является ли ошибка ошибкой таймаута
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('timeout') || error.message.includes('Timeout');
  }
  return false;
}

