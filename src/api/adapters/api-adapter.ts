/**
 * API Adapter - абстракция для переключения между прямыми API вызовами и бэкендом
 * 
 * Использование:
 * - VITE_API_MODE=direct (по умолчанию) - прямые вызовы к внешним API
 * - VITE_API_MODE=backend - вызовы через бэкенд API Gateway
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
 * TODO: Реализовать в задаче Ф4 (автоматическое определение режима)
 */
async function checkBackendHealth(): Promise<boolean> {
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
 * Создаем адаптер в зависимости от режима
 * 
 * TODO: Добавить HybridApiAdapter с fallback механизмом:
 * - При ошибке бэкенда → автоматически переключиться на DirectApiAdapter
 * - Использовать Circuit Breaker паттерн
 * - Логировать fallback события
 * 
 * TODO: Реализовать режим 'auto' который автоматически определяет оптимальный режим
 */
const createApiAdapter = async (): Promise<IApiAdapter> => {
  if (API_MODE === 'auto') {
    // TODO: Реализовать автоматическое определение (задача Ф4)
    // const isBackendAvailable = await checkBackendHealth();
    // return isBackendAvailable 
    //   ? new BackendApiAdapter(BACKEND_URL)
    //   : new DirectApiAdapter();
    // Пока fallback на direct
    return new DirectApiAdapter();
  }
  
  if (API_MODE === 'backend') {
    return new BackendApiAdapter(BACKEND_URL);
  }
  
  // TODO: Добавить режим 'hybrid' (задача Ф1)
  // if (API_MODE === 'hybrid') {
  //   return new HybridApiAdapter(
  //     new BackendApiAdapter(BACKEND_URL),
  //     new DirectApiAdapter()
  //   );
  // }
  
  return new DirectApiAdapter();
};

// Синхронная версия для обратной совместимости
// TODO: Сделать асинхронной после реализации auto режима
export const apiAdapter: IApiAdapter = new DirectApiAdapter();

export const apiAdapter: IApiAdapter = createApiAdapter();

/**
 * Экспортируем функции для удобства использования
 * Использование: import { getAllTokens } from '@/api/adapters/api-adapter';
 */
export const getAllTokens = (signal?: AbortSignal) => apiAdapter.getAllTokens(signal);
export const getJupiterTokens = (signal?: AbortSignal) => apiAdapter.getJupiterTokens(signal);
export const getPancakeTokens = (signal?: AbortSignal) => apiAdapter.getPancakeTokens(signal);
export const getMexcTokens = (signal?: AbortSignal) => apiAdapter.getMexcTokens(signal);
export const getAllPrices = (token: Token, signal?: AbortSignal) => apiAdapter.getAllPrices(token, signal);
export const getJupiterPrice = (symbol: string, address?: string, signal?: AbortSignal) => apiAdapter.getJupiterPrice(symbol, address, signal);
export const getPancakePrice = (symbol: string, signal?: AbortSignal) => apiAdapter.getPancakePrice(symbol, signal);
export const getMexcPrice = (symbol: string, signal?: AbortSignal) => apiAdapter.getMexcPrice(symbol, signal);
export const getSpreadData = (token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal) => apiAdapter.getSpreadData(token, timeframe, signal);
export const getSpreadsForTokens = (tokens: Token[], signal?: AbortSignal, maxTokens: number = 100) => apiAdapter.getSpreadsForTokens(tokens, signal, maxTokens);
