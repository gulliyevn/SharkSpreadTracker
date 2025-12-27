/**
 * Дедупликация запросов - предотвращает выполнение одинаковых запросов одновременно
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<unknown>> = new Map();
  private readonly maxAge = 5000; // 5 секунд - максимальный возраст pending запроса

  /**
   * Выполнить запрос с дедупликацией
   * Если такой же запрос уже выполняется, возвращает существующий Promise
   */
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Проверяем, есть ли уже pending запрос
    const existing = this.pendingRequests.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      // Если запрос не слишком старый, возвращаем существующий Promise
      if (age < this.maxAge) {
        return existing.promise as Promise<T>;
      } else {
        // Удаляем старый запрос
        this.pendingRequests.delete(key);
      }
    }

    // Создаем новый запрос
    const promise = requestFn().finally(() => {
      // Удаляем из pending после завершения
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Очистить старые pending запросы
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Очистить все pending запросы
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Получить количество pending запросов
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Глобальный экземпляр дедупликатора
export const requestDeduplicator = new RequestDeduplicator();

// Периодическая очистка старых запросов
// Сохраняем ID интервала для возможности очистки
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  cleanupIntervalId = setInterval(() => {
    requestDeduplicator.cleanup();
  }, 10000); // Каждые 10 секунд
}

/**
 * Очистить интервал периодической очистки дедупликатора
 * Вызывается при unmount приложения или hot reload
 */
export function cleanupDeduplicationInterval(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Очищаем интервал при hot reload в development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupDeduplicationInterval();
  });
}

/**
 * Создать ключ для дедупликации из параметров запроса
 */
export function createDeduplicationKey(
  endpoint: string,
  params?: Record<string, unknown>
): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map((key) => `${key}=${JSON.stringify(params[key])}`)
        .join('&')
    : '';
  return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
}
