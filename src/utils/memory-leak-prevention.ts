/**
 * Утилиты для предотвращения утечек памяти
 *
 * ⚠️ ВНИМАНИЕ: Этот файл в настоящее время НЕ используется в проекте.
 * Утилиты могут быть полезны для будущего использования в компонентах с подписками,
 * таймерами или большими кэшами.
 *
 * Если эти утилиты не будут использованы в ближайшее время, файл можно удалить.
 */

/**
 * Очистка таймеров и подписок
 */
export class CleanupManager {
  private timers: Set<
    ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>
  > = new Set();
  private subscriptions: Set<() => void> = new Set();
  private abortControllers: Set<AbortController> = new Set();

  /**
   * Добавить таймер для очистки
   */
  addTimer(
    timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>
  ): void {
    this.timers.add(timer);
  }

  /**
   * Добавить подписку для очистки
   */
  addSubscription(unsubscribe: () => void): void {
    this.subscriptions.add(unsubscribe);
  }

  /**
   * Добавить AbortController для очистки
   */
  addAbortController(controller: AbortController): void {
    this.abortControllers.add(controller);
  }

  /**
   * Очистить все ресурсы
   */
  cleanup(): void {
    // Очистка таймеров
    this.timers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();

    // Очистка подписок
    this.subscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error during subscription cleanup:', error);
      }
    });
    this.subscriptions.clear();

    // Отмена запросов
    this.abortControllers.forEach((controller) => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    this.abortControllers.clear();
  }
}

/**
 * Хук для автоматической очистки в useEffect
 */
export function useCleanup() {
  const cleanup = new CleanupManager();
  return cleanup;
}

/**
 * Очистка больших объектов из памяти
 */
export function clearLargeObjects(): void {
  if (typeof window !== 'undefined' && 'gc' in window) {
    // Принудительная сборка мусора (если доступна)
    (window as unknown as { gc: () => void }).gc();
  }
}

/**
 * Ограничение размера кэша
 */
export class CacheManager<T> {
  private cache: Map<string, T> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      // Удаляем самый старый элемент
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
