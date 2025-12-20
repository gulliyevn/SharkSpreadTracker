/**
 * API Adapter - абстракция для переключения между прямыми API вызовами и бэкендом
 * 
 * АВТОМАТИЧЕСКОЕ ПЕРЕКЛЮЧЕНИЕ (незаметно для пользователя):
 * - Работает без бэкенда: использует прямые вызовы к внешним API
 * - После подключения бэкенда: автоматически переключается на бэкенд
 * - При падении бэкенда: незаметно переключается обратно на прямые вызовы
 * - Периодически проверяет доступность бэкенда (каждые 30 секунд)
 * - При восстановлении бэкенда: автоматически возвращается на бэкенд
 * 
 * Использование:
 * - VITE_API_MODE=direct (по умолчанию) - прямые вызовы к внешним API (без бэкенда)
 * - VITE_API_MODE=backend - вызовы через бэкенд API Gateway с автоматическим fallback на direct
 * - VITE_API_MODE=hybrid - бэкенд с автоматическим fallback на direct при ошибке (Circuit Breaker)
 * - VITE_API_MODE=auto - автоматически определяет оптимальный режим и переключается при изменении доступности
 * 
 * Настройки:
 * - VITE_BACKEND_URL - URL бэкенда (по умолчанию: https://api.your-backend.com)
 * - VITE_API_FALLBACK_ENABLED - включить/выключить fallback в hybrid режиме (по умолчанию: true)
 */

import type { Token, SpreadResponse, TimeframeOption } from '@/types';
import type { TokenWithData } from '../endpoints/tokens.api';
import type { TokenPrice, AllPrices } from '../endpoints/prices.api';
import { logger } from '@/utils/logger';
import {
  invalidateTokensCache,
  invalidatePricesCache,
  invalidateSpreadsCache,
} from '@/utils/cache-utils';
import { analytics } from '@/lib/analytics';

export type ApiMode = 'direct' | 'backend' | 'hybrid' | 'auto';

/**
 * Определяем режим работы API
 * 
 * Режимы:
 * - 'direct' - прямые вызовы к внешним API (по умолчанию)
 * - 'backend' - вызовы через бэкенд API Gateway
 * - 'hybrid' - бэкенд с автоматическим fallback на direct при ошибке
 * - 'auto' - автоматически определяет оптимальный режим (проверяет доступность бэкенда)
 */
export const API_MODE: ApiMode = (import.meta.env.VITE_API_MODE as ApiMode) || 'direct';

/**
 * URL бэкенда (если используется режим backend)
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.your-backend.com';

/**
 * Интервал health check в миллисекундах (настраивается через env)
 */
export const HEALTH_CHECK_INTERVAL = Number(import.meta.env.VITE_HEALTH_CHECK_INTERVAL) || 30000; // 30 секунд по умолчанию

/**
 * Время кэширования результата health check в миллисекундах
 */
const HEALTH_CHECK_CACHE_TTL = 5000; // 5 секунд

/**
 * Интерфейс для API адаптера
 * Все функции API должны реализовывать этот интерфейс
 */
export interface IApiAdapter {
  // Tokens
  getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]>;
  getJupiterTokens(signal?: AbortSignal): Promise<Token[]>;
  getPancakeTokens(signal?: AbortSignal): Promise<Token[]>;
  getMexcTokens(signal?: AbortSignal): Promise<Token[]>;

  // Prices
  getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices>;
  getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null>;
  getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null>;
  getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null>;

  // Spreads
  getSpreadData(token: Token, timeframe?: TimeframeOption, signal?: AbortSignal): Promise<SpreadResponse>;
  getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens?: number): Promise<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>>;
}

/**
 * Direct API Adapter - использует прямые вызовы к внешним API
 */
class DirectApiAdapter implements IApiAdapter {
  async getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]> {
    const { getAllTokens } = await import('../endpoints/tokens.api');
    return getAllTokens(signal);
  }

  async getJupiterTokens(signal?: AbortSignal): Promise<Token[]> {
    const { getJupiterTokens } = await import('../endpoints/tokens.api');
    return getJupiterTokens(signal);
  }

  async getPancakeTokens(signal?: AbortSignal): Promise<Token[]> {
    const { getPancakeTokens } = await import('../endpoints/tokens.api');
    return getPancakeTokens(signal);
  }

  async getMexcTokens(signal?: AbortSignal): Promise<Token[]> {
    const { getMexcTokens } = await import('../endpoints/tokens.api');
    return getMexcTokens(signal);
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    const { getAllPrices } = await import('../endpoints/prices.api');
    return getAllPrices(token, signal);
  }

  async getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    const { getJupiterPrice } = await import('../endpoints/prices.api');
    return getJupiterPrice(symbol, address, signal);
  }

  async getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    const { getPancakePrice } = await import('../endpoints/prices.api');
    return getPancakePrice(symbol, signal);
  }

  async getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    const { getMexcPrice } = await import('../endpoints/prices.api');
    return getMexcPrice(symbol, signal);
  }

  async getSpreadData(token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal): Promise<SpreadResponse> {
    const { getSpreadData } = await import('../endpoints/spreads.api');
    return getSpreadData(token, timeframe, signal);
  }

  async getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens: number = 100) {
    const { getSpreadsForTokens } = await import('../endpoints/spreads.api');
    return getSpreadsForTokens(tokens, signal, maxTokens);
  }
}

/**
 * Backend API Adapter - использует бэкенд API Gateway
 * Автоматически переключается на direct при ошибках (если включен fallback)
 */
class BackendApiAdapter implements IApiAdapter {
  private baseURL: string;
  private directAdapter: DirectApiAdapter | null;
  private circuitBreaker: CircuitBreaker;
  private fallbackEnabled: boolean;

  constructor(baseURL: string, enableFallback: boolean = true) {
    this.baseURL = baseURL;
    this.fallbackEnabled = enableFallback;
    this.circuitBreaker = new CircuitBreaker();
    // Создаем direct adapter только если нужен fallback
    this.directAdapter = enableFallback ? new DirectApiAdapter() : null;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      // Проверяем offline режим
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Network is offline');
      }

      // Добавляем таймаут для запроса (3 секунды по умолчанию)
      const timeout = options?.signal || AbortSignal.timeout(3000);
      
      const startTime = Date.now();
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: timeout,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const responseTime = Date.now() - startTime;
      
      // Если ответ слишком медленный (> 3 секунд), считаем бэкенд недоступным
      if (responseTime > 3000) {
        logger.warn(`[BackendApiAdapter] Slow response (${responseTime}ms), switching to direct`);
        this.circuitBreaker.recordFailure();
        throw new Error('Backend response too slow');
      }

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      this.circuitBreaker.recordSuccess();
      return response.json();
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * Выполняет запрос с автоматическим fallback на direct при ошибке
   * Переключение происходит незаметно для пользователя
   */
  private async executeWithAutoFallback<T>(
    backendCall: () => Promise<T>,
    directCall: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Если fallback отключен или circuit breaker говорит использовать fallback
    if (!this.fallbackEnabled || !this.directAdapter || this.circuitBreaker.shouldUseFallback()) {
      if (this.directAdapter) {
        try {
          const result = await directCall();
          // Инвалидируем кэш при использовании fallback на direct
          invalidateTokensCache();
          invalidatePricesCache();
          invalidateSpreadsCache();
          // Успешный fallback - сбрасываем счетчик для следующей попытки бэкенда
          this.circuitBreaker.recordSuccess();
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            logger.error(`[BackendApiAdapter] Direct fallback failed for ${operationName}:`, error);
          }
          throw error;
        }
      }
      throw new Error(`Backend unavailable and fallback disabled for ${operationName}`);
    }

    // Пытаемся использовать бэкенд
    try {
      const result = await backendCall();
      // Успешный запрос к бэкенду - сбрасываем circuit breaker
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      // Бэкенд недоступен - переключаемся на direct незаметно
      if (import.meta.env.DEV) {
        logger.warn(`[BackendApiAdapter] Backend failed for ${operationName}, auto-switching to direct`);
      }
      
      // Автоматический fallback на direct
      if (this.directAdapter) {
        try {
          const result = await directCall();
          if (import.meta.env.DEV) {
            logger.info(`[BackendApiAdapter] Auto-switched to direct for ${operationName}`);
          }
          // Инвалидируем кэш при переключении на direct
          invalidateTokensCache();
          invalidatePricesCache();
          invalidateSpreadsCache();
          // Успешный fallback - сбрасываем счетчик для следующей попытки бэкенда
          this.circuitBreaker.recordSuccess();
          return result;
        } catch (fallbackError) {
          if (import.meta.env.DEV) {
            logger.error(`[BackendApiAdapter] Direct fallback also failed for ${operationName}:`, fallbackError);
          }
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<TokenWithData[]>('/api/tokens', { signal }),
        () => this.directAdapter!.getAllTokens(signal),
        'getAllTokens'
      );
    }
    return this.request<TokenWithData[]>('/api/tokens', { signal });
  }

  async getJupiterTokens(signal?: AbortSignal): Promise<Token[]> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<Token[]>('/api/tokens/jupiter', { signal }),
        () => this.directAdapter!.getJupiterTokens(signal),
        'getJupiterTokens'
      );
    }
    return this.request<Token[]>('/api/tokens/jupiter', { signal });
  }

  async getPancakeTokens(signal?: AbortSignal): Promise<Token[]> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<Token[]>('/api/tokens/pancake', { signal }),
        () => this.directAdapter!.getPancakeTokens(signal),
        'getPancakeTokens'
      );
    }
    return this.request<Token[]>('/api/tokens/pancake', { signal });
  }

  async getMexcTokens(signal?: AbortSignal): Promise<Token[]> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<Token[]>('/api/tokens/mexc', { signal }),
        () => this.directAdapter!.getMexcTokens(signal),
        'getMexcTokens'
      );
    }
    return this.request<Token[]>('/api/tokens/mexc', { signal });
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<AllPrices>(`/api/prices?symbol=${token.symbol}&chain=${token.chain}`, { signal }),
        () => this.directAdapter!.getAllPrices(token, signal),
        'getAllPrices'
      );
    }
    return this.request<AllPrices>(`/api/prices?symbol=${token.symbol}&chain=${token.chain}`, { signal });
  }

  async getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        async () => {
          const params = new URLSearchParams({ symbol });
          if (address) params.set('address', address);
          return this.request<TokenPrice | null>(`/api/prices/jupiter?${params}`, { signal });
        },
        () => this.directAdapter!.getJupiterPrice(symbol, address, signal),
        'getJupiterPrice'
      );
    }
    const params = new URLSearchParams({ symbol });
    if (address) params.set('address', address);
    return this.request<TokenPrice | null>(`/api/prices/jupiter?${params}`, { signal });
  }

  async getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<TokenPrice | null>(`/api/prices/pancake?symbol=${symbol}`, { signal }),
        () => this.directAdapter!.getPancakePrice(symbol, signal),
        'getPancakePrice'
      );
    }
    return this.request<TokenPrice | null>(`/api/prices/pancake?symbol=${symbol}`, { signal });
  }

  async getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<TokenPrice | null>(`/api/prices/mexc?symbol=${symbol}`, { signal }),
        () => this.directAdapter!.getMexcPrice(symbol, signal),
        'getMexcPrice'
      );
    }
    return this.request<TokenPrice | null>(`/api/prices/mexc?symbol=${symbol}`, { signal });
  }

  async getSpreadData(token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal): Promise<SpreadResponse> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<SpreadResponse>(`/api/spreads?symbol=${token.symbol}&chain=${token.chain}&timeframe=${timeframe}`, { signal }),
        () => this.directAdapter!.getSpreadData(token, timeframe, signal),
        'getSpreadData'
      );
    }
    return this.request<SpreadResponse>(`/api/spreads?symbol=${token.symbol}&chain=${token.chain}&timeframe=${timeframe}`, { signal });
  }

  async getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens: number = 100): Promise<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>> {
    if (this.fallbackEnabled && this.directAdapter) {
      return this.executeWithAutoFallback(
        () => this.request<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>>(`/api/spreads/batch`, {
          method: 'POST',
          body: JSON.stringify({ tokens: tokens.slice(0, maxTokens) }),
          signal,
        }),
        () => this.directAdapter!.getSpreadsForTokens(tokens, signal, maxTokens),
        'getSpreadsForTokens'
      );
    }
    return this.request<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>>(`/api/spreads/batch`, {
      method: 'POST',
      body: JSON.stringify({ tokens: tokens.slice(0, maxTokens) }),
      signal,
    });
  }
}

/**
 * Проверка доступности бэкенда через health check
 * @internal - используется для auto режима и fallback механизма
 */
export async function checkBackendHealth(useCache = true): Promise<boolean> {
  try {
    // Проверяем offline режим
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.debug('[checkBackendHealth] Network is offline, skipping health check');
      return false;
    }

    // Проверяем кэш
    if (useCache && healthCheckCache) {
      const now = Date.now();
      if (now - healthCheckCache.timestamp < HEALTH_CHECK_CACHE_TTL) {
        logger.debug('[checkBackendHealth] Using cached result');
        return healthCheckCache.result;
      }
    }

    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 секунд таймаут
    });
    
    const isHealthy = response.ok;
    
    // Кэшируем результат
    healthCheckCache = {
      result: isHealthy,
      timestamp: Date.now(),
    };
    
    // Отправляем событие в аналитику при неудачной проверке
    if (!isHealthy) {
      analytics.track('backend_health_check_failed', {
        status: response.status,
        statusText: response.statusText,
        url: BACKEND_URL,
      });
    }
    
    return isHealthy;
  } catch (error) {
    logger.debug('[checkBackendHealth] Health check failed:', error);
    
    // Кэшируем отрицательный результат
    healthCheckCache = {
      result: false,
      timestamp: Date.now(),
    };
    
    // Отправляем событие в аналитику при ошибке
    analytics.track('backend_health_check_failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
      url: BACKEND_URL,
    });
    
    return false;
  }
}

/**
 * Circuit Breaker для предотвращения постоянных переключений
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3; // После 3 ошибок переключаемся
  private readonly resetTimeout = 60000; // 60 секунд до попытки восстановления

  recordSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  shouldUseFallback(): boolean {
    if (this.failures >= this.failureThreshold) {
      // Проверяем, прошло ли достаточно времени для попытки восстановления
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.resetTimeout) {
        return true; // Используем fallback
      } else {
        // Время прошло, сбрасываем счетчик для новой попытки
        this.failures = 0;
        return false;
      }
    }
    return false;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Hybrid API Adapter - использует бэкенд с автоматическим fallback на direct
 * При ошибке бэкенда автоматически переключается на прямые вызовы API
 */
class HybridApiAdapter implements IApiAdapter {
  private backendAdapter: BackendApiAdapter;
  private directAdapter: DirectApiAdapter;
  private circuitBreaker: CircuitBreaker;
  private fallbackEnabled: boolean;

  constructor(backendAdapter: BackendApiAdapter, directAdapter: DirectApiAdapter) {
    this.backendAdapter = backendAdapter;
    this.directAdapter = directAdapter;
    this.circuitBreaker = new CircuitBreaker();
    this.fallbackEnabled = import.meta.env.VITE_API_FALLBACK_ENABLED !== 'false';
  }

  /**
   * Выполняет запрос с fallback механизмом
   */
  private async executeWithFallback<T>(
    backendCall: () => Promise<T>,
    directCall: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Если fallback отключен или circuit breaker говорит использовать fallback
    if (!this.fallbackEnabled || this.circuitBreaker.shouldUseFallback()) {
      try {
        const result = await directCall();
        // Инвалидируем кэш при использовании fallback на direct
        invalidateTokensCache();
        invalidatePricesCache();
        invalidateSpreadsCache();
        // Если успешно, сбрасываем счетчик (может быть, бэкенд восстановился)
        if (this.fallbackEnabled) {
          this.circuitBreaker.recordSuccess();
        }
        return result;
      } catch (error) {
        logger.error(`[HybridApiAdapter] Direct call failed for ${operationName}:`, error);
        throw error;
      }
    }

    // Пытаемся использовать бэкенд
    try {
      const result = await backendCall();
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      logger.warn(`[HybridApiAdapter] Backend call failed for ${operationName}, falling back to direct:`, error);
      this.circuitBreaker.recordFailure();

      // Fallback на direct
      try {
        const result = await directCall();
        // Инвалидируем кэш при fallback на direct
        invalidateTokensCache();
        invalidatePricesCache();
        invalidateSpreadsCache();
        logger.info(`[HybridApiAdapter] Fallback to direct succeeded for ${operationName}`);
        return result;
      } catch (fallbackError) {
        logger.error(`[HybridApiAdapter] Fallback to direct also failed for ${operationName}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  async getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]> {
    return this.executeWithFallback(
      () => this.backendAdapter.getAllTokens(signal),
      () => this.directAdapter.getAllTokens(signal),
      'getAllTokens'
    );
  }

  async getJupiterTokens(signal?: AbortSignal): Promise<Token[]> {
    return this.executeWithFallback(
      () => this.backendAdapter.getJupiterTokens(signal),
      () => this.directAdapter.getJupiterTokens(signal),
      'getJupiterTokens'
    );
  }

  async getPancakeTokens(signal?: AbortSignal): Promise<Token[]> {
    return this.executeWithFallback(
      () => this.backendAdapter.getPancakeTokens(signal),
      () => this.directAdapter.getPancakeTokens(signal),
      'getPancakeTokens'
    );
  }

  async getMexcTokens(signal?: AbortSignal): Promise<Token[]> {
    return this.executeWithFallback(
      () => this.backendAdapter.getMexcTokens(signal),
      () => this.directAdapter.getMexcTokens(signal),
      'getMexcTokens'
    );
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    return this.executeWithFallback(
      () => this.backendAdapter.getAllPrices(token, signal),
      () => this.directAdapter.getAllPrices(token, signal),
      'getAllPrices'
    );
  }

  async getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    return this.executeWithFallback(
      () => this.backendAdapter.getJupiterPrice(symbol, address, signal),
      () => this.directAdapter.getJupiterPrice(symbol, address, signal),
      'getJupiterPrice'
    );
  }

  async getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    return this.executeWithFallback(
      () => this.backendAdapter.getPancakePrice(symbol, signal),
      () => this.directAdapter.getPancakePrice(symbol, signal),
      'getPancakePrice'
    );
  }

  async getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    return this.executeWithFallback(
      () => this.backendAdapter.getMexcPrice(symbol, signal),
      () => this.directAdapter.getMexcPrice(symbol, signal),
      'getMexcPrice'
    );
  }

  async getSpreadData(token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal): Promise<SpreadResponse> {
    return this.executeWithFallback(
      () => this.backendAdapter.getSpreadData(token, timeframe, signal),
      () => this.directAdapter.getSpreadData(token, timeframe, signal),
      'getSpreadData'
    );
  }

  async getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens: number = 100) {
    return this.executeWithFallback(
      () => this.backendAdapter.getSpreadsForTokens(tokens, signal, maxTokens),
      () => this.directAdapter.getSpreadsForTokens(tokens, signal, maxTokens),
      'getSpreadsForTokens'
    );
  }
}

/**
 * Создаем адаптер в зависимости от режима
 * 
 * Реализованные режимы:
 * - 'direct' - прямые вызовы к внешним API
 * - 'backend' - вызовы через бэкенд API Gateway
 * - 'hybrid' - бэкенд с автоматическим fallback на direct при ошибке (Circuit Breaker)
 * - 'auto' - автоматически определяет оптимальный режим (проверяет доступность бэкенда)
 */
async function createApiAdapter(): Promise<IApiAdapter> {
  if (API_MODE === 'auto') {
    // Автоматически определяем оптимальный режим
    const isBackendAvailable = await checkBackendHealth();
    
    // Используем logger для консистентности (только в dev)
    if (isBackendAvailable) {
      if (import.meta.env.DEV) {
        logger.info('[ApiAdapter] Auto mode: Backend is available, using BackendApiAdapter with auto-fallback');
      }
      // В auto режиме включаем автоматический fallback на direct
      return new BackendApiAdapter(BACKEND_URL, true);
    } else {
      if (import.meta.env.DEV) {
        logger.info('[ApiAdapter] Auto mode: Backend is not available, using DirectApiAdapter');
      }
      return new DirectApiAdapter();
    }
  }
  
  if (API_MODE === 'backend') {
    // В режиме backend тоже включаем автоматический fallback на direct при ошибках
    return new BackendApiAdapter(BACKEND_URL, true);
  }
  
  if (API_MODE === 'hybrid') {
    // В hybrid режиме BackendApiAdapter тоже должен иметь fallback
    return new HybridApiAdapter(
      new BackendApiAdapter(BACKEND_URL, true),
      new DirectApiAdapter()
    );
  }
  
  return new DirectApiAdapter();
}

// Ленивая инициализация адаптера
let apiAdapterPromise: Promise<IApiAdapter> | null = null;
let apiAdapterInstance: IApiAdapter | null = null;
let healthCheckInterval: number | null = null;

// Кэш для результата health check
let healthCheckCache: { result: boolean; timestamp: number } | null = null;

// Счетчик переключений для экспоненциального backoff
let switchCount = 0;
let lastSwitchTime = 0;

/**
 * Периодическая проверка здоровья бэкенда для автоматического переключения
 * Работает в режимах: 'auto', 'backend', 'hybrid'
 * Если бэкенд восстановился, переключаемся обратно на него
 */
function startAutoModeHealthCheck() {
  // Работает только в режимах, где используется бэкенд
  if (API_MODE === 'direct') {
    return;
  }

  // Очищаем предыдущий интервал, если есть
  if (healthCheckInterval !== null) {
    clearInterval(healthCheckInterval);
  }

  // Вычисляем интервал с учетом экспоненциального backoff
  const getHealthCheckInterval = (): number => {
    const baseInterval = HEALTH_CHECK_INTERVAL;
    const now = Date.now();
    
    // Если было много переключений недавно, увеличиваем интервал
    if (switchCount > 0 && now - lastSwitchTime < 60000) {
      // Экспоненциальный backoff: 30s, 60s, 120s, 240s (максимум 5 минут)
      const backoffMultiplier = Math.min(Math.pow(2, switchCount - 1), 10);
      return baseInterval * backoffMultiplier;
    }
    
    // Если бэкенд стабилен (нет переключений за последние 5 минут), уменьшаем частоту
    if (switchCount === 0 && now - lastSwitchTime > 300000) {
      return baseInterval * 2; // Проверяем реже
    }
    
    return baseInterval;
  };

  // Выполняем проверку с динамическим интервалом
  const performHealthCheck = async () => {
    try {
      // Пропускаем проверку в offline режиме
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (import.meta.env.DEV) {
          logger.debug('[ApiAdapter] Skipping health check: network is offline');
        }
        return;
      }

      const isBackendAvailable = await checkBackendHealth();
      
      // В режиме 'auto': переключаемся между BackendApiAdapter и DirectApiAdapter
      if (API_MODE === 'auto') {
        // Если бэкенд доступен, но мы используем direct - переключаемся обратно
        if (isBackendAvailable && apiAdapterInstance instanceof DirectApiAdapter) {
          if (import.meta.env.DEV) {
            logger.info('[ApiAdapter] Auto mode: Backend recovered, switching back to BackendApiAdapter');
          }
          // Сбрасываем счетчик переключений при успешном восстановлении
          switchCount = 0;
          // Отправляем событие в аналитику
          analytics.track('backend_recovered', {
            mode: API_MODE,
            previousMode: 'direct',
          });
          // Инвалидируем кэш при переключении с direct на backend
          invalidateTokensCache();
          invalidatePricesCache();
          invalidateSpreadsCache();
          // Пересоздаем адаптер
          apiAdapterPromise = null;
          apiAdapterInstance = null;
          await getApiAdapter();
        }
        // Если бэкенд недоступен, но мы используем backend - переключаемся на direct
        else if (!isBackendAvailable && apiAdapterInstance instanceof BackendApiAdapter) {
          if (import.meta.env.DEV) {
            logger.info('[ApiAdapter] Auto mode: Backend unavailable, switching to DirectApiAdapter');
          }
          // Увеличиваем счетчик переключений
          switchCount++;
          lastSwitchTime = Date.now();
          // Отправляем событие в аналитику
          analytics.track('backend_fallback_activated', {
            mode: API_MODE,
            reason: 'health_check_failed',
            previousMode: 'backend',
          });
          // Инвалидируем кэш при переключении с backend на direct
          invalidateTokensCache();
          invalidatePricesCache();
          invalidateSpreadsCache();
          // Пересоздаем адаптер
          apiAdapterPromise = null;
          apiAdapterInstance = new DirectApiAdapter();
        } else if (isBackendAvailable && apiAdapterInstance instanceof BackendApiAdapter) {
          // Бэкенд стабилен - сбрасываем счетчик переключений
          if (switchCount > 0) {
            switchCount = 0;
          }
        }
      }
      // В режимах 'backend' и 'hybrid': сбрасываем circuit breaker при восстановлении бэкенда
      else if (API_MODE === 'backend' || API_MODE === 'hybrid') {
        if (isBackendAvailable) {
          // Если бэкенд восстановился, сбрасываем circuit breaker в BackendApiAdapter
          // Это позволит следующему запросу попробовать использовать бэкенд
          if (apiAdapterInstance instanceof BackendApiAdapter) {
            // Circuit breaker сбросится автоматически при успешном запросе
            // Но мы можем принудительно сбросить его здесь для более быстрого переключения
            if (import.meta.env.DEV) {
              logger.info('[ApiAdapter] Backend recovered, circuit breaker will reset on next successful request');
            }
          } else if (apiAdapterInstance instanceof HybridApiAdapter) {
            // В hybrid режиме circuit breaker тоже сбросится при успешном запросе
            if (import.meta.env.DEV) {
              logger.info('[ApiAdapter] Backend recovered, will try backend on next request');
            }
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки проверки здоровья
      if (import.meta.env.DEV) {
        logger.debug('[ApiAdapter] Health check error:', error);
      }
    }
    
    // Планируем следующую проверку с динамическим интервалом
    const nextInterval = getHealthCheckInterval();
    if (healthCheckInterval !== null) {
      clearTimeout(healthCheckInterval);
    }
    healthCheckInterval = window.setTimeout(performHealthCheck, nextInterval);
  };
  
  // Запускаем первую проверку сразу
  performHealthCheck();
}

/**
 * Получить экземпляр адаптера (с ленивой инициализацией)
 */
export async function getApiAdapter(): Promise<IApiAdapter> {
  // Если уже инициализирован, возвращаем сразу
  if (apiAdapterInstance) {
    return apiAdapterInstance;
  }
  
  // Если инициализация уже началась, ждём её
  if (apiAdapterPromise) {
    return apiAdapterPromise;
  }
  
  // Начинаем инициализацию
  apiAdapterPromise = createApiAdapter();
  apiAdapterInstance = await apiAdapterPromise;
  
  // Запускаем периодическую проверку здоровья для режимов с бэкендом (только в браузере)
  if ((API_MODE === 'auto' || API_MODE === 'backend' || API_MODE === 'hybrid') && 
      typeof window !== 'undefined' && typeof window.setInterval !== 'undefined') {
    startAutoModeHealthCheck();
  }
  
  return apiAdapterInstance;
}

/**
 * Синхронный доступ к адаптеру (для режимов, не требующих async)
 * Для 'auto' режима будет использован direct как fallback до инициализации
 */
function getApiAdapterSync(): IApiAdapter {
  if (apiAdapterInstance) {
    return apiAdapterInstance;
  }
  
  // Для синхронного доступа используем direct как fallback
  // Это нужно для случаев, когда адаптер используется до инициализации
  if (API_MODE === 'auto') {
    // Инициализируем в фоне
    getApiAdapter().catch((error) => {
      logger.error('[ApiAdapter] Failed to initialize adapter:', error);
    });
    // Возвращаем direct как временный fallback
    return new DirectApiAdapter();
  }
  
  // Для других режимов создаём синхронно
  if (API_MODE === 'backend') {
    apiAdapterInstance = new BackendApiAdapter(BACKEND_URL, true);
    return apiAdapterInstance;
  }
  
  if (API_MODE === 'hybrid') {
    apiAdapterInstance = new HybridApiAdapter(
      new BackendApiAdapter(BACKEND_URL),
      new DirectApiAdapter()
    );
    return apiAdapterInstance;
  }
  
  apiAdapterInstance = new DirectApiAdapter();
  return apiAdapterInstance;
}

// Экспортируем адаптер (для обратной совместимости)
// В auto режиме будет инициализирован асинхронно
export const apiAdapter: IApiAdapter = getApiAdapterSync();

/**
 * Экспортируем функции для удобства использования
 * Использование: import { getAllTokens } from '@/api/adapters/api-adapter';
 * 
 * Для auto режима адаптер инициализируется асинхронно при первом вызове
 */
export const getAllTokens = async (signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getAllTokens(signal);
};

export const getJupiterTokens = async (signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getJupiterTokens(signal);
};

export const getPancakeTokens = async (signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getPancakeTokens(signal);
};

export const getMexcTokens = async (signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getMexcTokens(signal);
};

export const getAllPrices = async (token: Token, signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getAllPrices(token, signal);
};

export const getJupiterPrice = async (symbol: string, address?: string, signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getJupiterPrice(symbol, address, signal);
};

export const getPancakePrice = async (symbol: string, signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getPancakePrice(symbol, signal);
};

export const getMexcPrice = async (symbol: string, signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getMexcPrice(symbol, signal);
};

export const getSpreadData = async (token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal) => {
  const adapter = await getApiAdapter();
  return adapter.getSpreadData(token, timeframe, signal);
};

export const getSpreadsForTokens = async (tokens: Token[], signal?: AbortSignal, maxTokens: number = 100) => {
  const adapter = await getApiAdapter();
  return adapter.getSpreadsForTokens(tokens, signal, maxTokens);
};
