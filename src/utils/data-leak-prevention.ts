/**
 * Защита от утечек данных
 */

/**
 * Маскирование чувствительных данных в логах
 */
export function maskSensitiveData(data: string): string {
  if (data.length <= 4) {
    return '****';
  }
  return `${data.slice(0, 2)}${'*'.repeat(data.length - 4)}${data.slice(-2)}`;
}

/**
 * Безопасное логирование (без чувствительных данных)
 */
export function safeLog(message: string, data?: unknown): void {
  if (import.meta.env.PROD) {
    // В production не логируем детали
    console.log(message);
    return;
  }
  // В development логируем все
  console.log(message, data);
}

/**
 * Очистка данных перед отправкой в аналитику
 */
export function sanitizeForAnalytics(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['apiKey', 'api_key', 'token', 'password', 'secret'];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForAnalytics(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Проверка на утечку данных в URL
 */
export function checkUrlForLeaks(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const sensitiveParams = ['api_key', 'token', 'password', 'secret', 'key'];

  sensitiveParams.forEach((param) => {
    if (url.searchParams.has(param)) {
      console.warn(`⚠️ Sensitive parameter "${param}" detected in URL!`);
      // Удаляем из URL
      url.searchParams.delete(param);
      window.history.replaceState({}, '', url.toString());
    }
  });
}

// Автоматическая проверка при загрузке
if (typeof window !== 'undefined') {
  checkUrlForLeaks();
}
