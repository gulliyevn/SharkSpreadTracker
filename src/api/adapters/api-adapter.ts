/**
 * API Adapter - абстракция для переключения между прямыми API вызовами и бэкендом
 * 
 * Использование:
 * - VITE_API_MODE=direct (по умолчанию) - прямые вызовы к внешним API
 * - VITE_API_MODE=backend - вызовы через бэкенд API Gateway
 * - VITE_API_MODE=hybrid - бэкенд с автоматическим fallback на direct при ошибке
 * - VITE_API_MODE=auto - автоматически определяет оптимальный режим (TODO: задача Ф4)
 * 
 * Настройки:
 * - VITE_BACKEND_URL - URL бэкенда (по умолчанию: https://api.your-backend.com)
 * - VITE_API_FALLBACK_ENABLED - включить/выключить fallback в hybrid режиме (по умолчанию: true)
 */

import type { Token, SpreadResponse, TimeframeOption } from '@/types';
import type { TokenWithData } from '../endpoints/tokens.api';
import type { TokenPrice, AllPrices } from '../endpoints/prices.api';

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
 */
class BackendApiAdapter implements IApiAdapter {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]> {
    return this.request<TokenWithData[]>('/api/tokens', { signal });
  }

  async getJupiterTokens(signal?: AbortSignal): Promise<Token[]> {
    return this.request<Token[]>('/api/tokens/jupiter', { signal });
  }

  async getPancakeTokens(signal?: AbortSignal): Promise<Token[]> {
    return this.request<Token[]>('/api/tokens/pancake', { signal });
  }

  async getMexcTokens(signal?: AbortSignal): Promise<Token[]> {
    return this.request<Token[]>('/api/tokens/mexc', { signal });
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    return this.request<AllPrices>(`/api/prices?symbol=${token.symbol}&chain=${token.chain}`, { signal });
  }

  async getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    const params = new URLSearchParams({ symbol });
    if (address) params.set('address', address);
    return this.request<TokenPrice | null>(`/api/prices/jupiter?${params}`, { signal });
  }

  async getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    return this.request<TokenPrice | null>(`/api/prices/pancake?symbol=${symbol}`, { signal });
  }

  async getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null> {
    return this.request<TokenPrice | null>(`/api/prices/mexc?symbol=${symbol}`, { signal });
  }

  async getSpreadData(token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal): Promise<SpreadResponse> {
    return this.request<SpreadResponse>(`/api/spreads?symbol=${token.symbol}&chain=${token.chain}&timeframe=${timeframe}`, { signal });
  }

  async getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens: number = 100): Promise<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>> {
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
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 секунд таймаут
    });
    return response.ok;
  } catch {
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
  private logger: typeof console;

  constructor(backendAdapter: BackendApiAdapter, directAdapter: DirectApiAdapter) {
    this.backendAdapter = backendAdapter;
    this.directAdapter = directAdapter;
    this.circuitBreaker = new CircuitBreaker();
    this.fallbackEnabled = import.meta.env.VITE_API_FALLBACK_ENABLED !== 'false';
    this.logger = console;
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
        // Если успешно, сбрасываем счетчик (может быть, бэкенд восстановился)
        if (this.fallbackEnabled) {
          this.circuitBreaker.recordSuccess();
        }
        return result;
      } catch (error) {
        this.logger.error(`[HybridApiAdapter] Direct call failed for ${operationName}:`, error);
        throw error;
      }
    }

    // Пытаемся использовать бэкенд
    try {
      const result = await backendCall();
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.logger.warn(`[HybridApiAdapter] Backend call failed for ${operationName}, falling back to direct:`, error);
      this.circuitBreaker.recordFailure();

      // Fallback на direct
      try {
        const result = await directCall();
        this.logger.info(`[HybridApiAdapter] Fallback to direct succeeded for ${operationName}`);
        return result;
      } catch (fallbackError) {
        this.logger.error(`[HybridApiAdapter] Fallback to direct also failed for ${operationName}:`, fallbackError);
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
        // eslint-disable-next-line no-console
        console.log('[ApiAdapter] Auto mode: Backend is available, using BackendApiAdapter');
      }
      return new BackendApiAdapter(BACKEND_URL);
    } else {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[ApiAdapter] Auto mode: Backend is not available, using DirectApiAdapter');
      }
      return new DirectApiAdapter();
    }
  }
  
  if (API_MODE === 'backend') {
    return new BackendApiAdapter(BACKEND_URL);
  }
  
  if (API_MODE === 'hybrid') {
    return new HybridApiAdapter(
      new BackendApiAdapter(BACKEND_URL),
      new DirectApiAdapter()
    );
  }
  
  return new DirectApiAdapter();
}

// Ленивая инициализация адаптера
let apiAdapterPromise: Promise<IApiAdapter> | null = null;
let apiAdapterInstance: IApiAdapter | null = null;

/**
 * Получить экземпляр адаптера (с ленивой инициализацией)
 */
async function getApiAdapter(): Promise<IApiAdapter> {
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
      console.error('[ApiAdapter] Failed to initialize adapter:', error);
    });
    // Возвращаем direct как временный fallback
    return new DirectApiAdapter();
  }
  
  // Для других режимов создаём синхронно
  if (API_MODE === 'backend') {
    apiAdapterInstance = new BackendApiAdapter(BACKEND_URL);
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
