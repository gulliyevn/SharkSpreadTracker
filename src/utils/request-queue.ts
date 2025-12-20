/**
 * Очередь запросов с приоритизацией и exponential backoff
 * Решает проблемы с rate limits и оптимизирует параллельные запросы
 */

import { rateLimiter } from './security';

/**
 * Приоритет запроса
 */
export enum RequestPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Интерфейс запроса в очереди
 */
interface QueuedRequest<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  priority: RequestPriority;
  retries: number;
  maxRetries: number;
  backoffMs: number;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

/**
 * Конфигурация очереди запросов
 */
interface RequestQueueConfig {
  maxConcurrent: number; // Максимальное количество параллельных запросов
  defaultRetries: number; // Количество попыток по умолчанию
  baseBackoffMs: number; // Базовая задержка для exponential backoff
  maxBackoffMs: number; // Максимальная задержка
}

const DEFAULT_CONFIG: RequestQueueConfig = {
  maxConcurrent: 5,
  defaultRetries: 3,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
};

/**
 * Класс очереди запросов с приоритизацией
 */
class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private processing: Set<string> = new Set();
  private config: RequestQueueConfig;

  constructor(config: Partial<RequestQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Добавить запрос в очередь
   */
  async add<T>(
    execute: () => Promise<T>,
    options: {
      priority?: RequestPriority;
      maxRetries?: number;
      rateLimitKey?: string; // Ключ для rate limiter (например, 'jupiter-api')
    } = {}
  ): Promise<T> {
    const {
      priority = RequestPriority.NORMAL,
      maxRetries = this.config.defaultRetries,
      rateLimitKey,
    } = options;

    return new Promise<T>((resolve, reject) => {
      const id = `${Date.now()}-${Math.random()}`;
      const request: QueuedRequest<T> = {
        id,
        execute,
        priority,
        retries: 0,
        maxRetries,
        backoffMs: this.config.baseBackoffMs,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Проверка rate limit перед добавлением в очередь
      if (rateLimitKey && !rateLimiter.isAllowed(rateLimitKey)) {
        // Если rate limit превышен, добавляем с задержкой
        setTimeout(() => {
          this.queue.push(request as QueuedRequest<unknown>);
          this.sortQueue();
          this.process();
        }, this.config.baseBackoffMs);
        return;
      }

      this.queue.push(request as QueuedRequest<unknown>);
      this.sortQueue();
      this.process();
    });
  }

  /**
   * Сортировать очередь по приоритету и времени добавления
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Сначала по приоритету (высокий приоритет первым)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Затем по времени добавления (старые первыми)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Обработать очередь
   */
  private async process(): Promise<void> {
    // Не обрабатываем, если уже обрабатываем максимальное количество запросов
    if (this.processing.size >= this.config.maxConcurrent) {
      return;
    }

    // Берем следующий запрос из очереди
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.processing.add(request.id);

    try {
      // Проверка rate limit перед выполнением
      const rateLimitKey = this.getRateLimitKey(request);
      if (rateLimitKey && !rateLimiter.isAllowed(rateLimitKey)) {
        // Rate limit превышен, возвращаем в очередь с задержкой
        this.queue.push({
          ...request,
          backoffMs: Math.min(
            request.backoffMs * 2,
            this.config.maxBackoffMs
          ),
        });
        this.sortQueue();
        this.processing.delete(request.id);
        
        // Планируем повторную попытку
        setTimeout(() => {
          this.process();
        }, request.backoffMs);
        return;
      }

      // Выполняем запрос
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      // Если это rate limit ошибка, повторяем с exponential backoff
      if (this.isRateLimitError(error)) {
        if (request.retries < request.maxRetries) {
          request.retries++;
          request.backoffMs = Math.min(
            request.backoffMs * 2,
            this.config.maxBackoffMs
          );
          
          // Возвращаем в очередь с задержкой
          setTimeout(() => {
            this.queue.push(request);
            this.sortQueue();
            this.process();
          }, request.backoffMs);
        } else {
          request.reject(error);
        }
      } else {
        // Другие ошибки не повторяем
        request.reject(error);
      }
    } finally {
      this.processing.delete(request.id);
      // Обрабатываем следующий запрос
      this.process();
    }
  }

  /**
   * Получить ключ rate limiter из запроса (если есть)
   */
  private getRateLimitKey(_request: QueuedRequest<unknown>): string | null {
    // Можно добавить логику определения ключа из запроса
    // Пока возвращаем null, ключ передается через options
    return null;
  }

  /**
   * Проверить, является ли ошибка rate limit ошибкой
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('rate limit') ||
        error.message.includes('429') ||
        error.message.includes('Too Many Requests')
      );
    }
    return false;
  }

  /**
   * Очистить очередь
   */
  clear(): void {
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing.clear();
  }

  /**
   * Получить размер очереди
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * Получить количество обрабатываемых запросов
   */
  getProcessingCount(): number {
    return this.processing.size;
  }
}

// Создаем глобальный экземпляр очереди
export const requestQueue = new RequestQueue({
  maxConcurrent: 5,
  defaultRetries: 3,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
});

/**
 * Обертка для выполнения запроса через очередь
 */
export async function queuedRequest<T>(
  execute: () => Promise<T>,
  options: {
    priority?: RequestPriority;
    maxRetries?: number;
    rateLimitKey?: string;
  } = {}
): Promise<T> {
  return requestQueue.add(execute, options);
}
