/**
 * Утилиты для безопасности
 */

/**
 * Санитизация строки для предотвращения XSS
 */
export function sanitizeString(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Валидация и санитизация URL
 * В backend-only режиме разрешаем только URL бэкенда из ENV
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Разрешаем HTTP(S) и WS(S)
    const allowedProtocols = ['https:', 'http:', 'ws:', 'wss:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    // В backend-only режиме проверяем соответствие хосту бэкенда
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      try {
        const backendParsed = new URL(backendUrl);
        if (parsed.hostname === backendParsed.hostname) {
          return url;
        }
      } catch {
        // Если BACKEND_URL невалидный, разрешаем localhost для дева
      }
    }
    // Разрешаем localhost для разработки
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Валидация токена символа (только буквы, цифры, дефис, подчеркивание)
 */
export function sanitizeTokenSymbol(symbol: string): string {
  return symbol.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Валидация числовых значений
 */
export function sanitizeNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  return num;
}

/**
 * Защита от слишком частых запросов (rate limiting)
 *
 * ✅ RateLimiter интегрирован во все API вызовы:
 * - Jupiter API (jupiter-api)
 * - PancakeSwap API (pancakeswap-api)
 * - MEXC API (mexc-api)
 *
 * Используется через:
 * - Прямые проверки в API endpoints
 * - RequestQueue для автоматического exponential backoff
 *
 * Пример использования:
 * ```ts
 * if (rateLimiter.isAllowed('jupiter-api')) {
 *   // выполнить запрос
 * } else {
 *   // вернуть ошибку rate limit или использовать exponential backoff
 * }
 * ```
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Удаляем старые запросы
    const recentRequests = requests.filter(
      (time) => now - time < this.windowMs
    );

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter(10, 1000); // 10 запросов в секунду

/**
 * Безопасное извлечение данных из объекта
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return (current as T) ?? defaultValue;
}

/**
 * Защита от CSRF - генерация токена
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Валидация timestamp (защита от replay атак)
 */
export function isValidTimestamp(
  timestamp: number,
  maxAgeMs: number = 60000
): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAgeMs;
}
