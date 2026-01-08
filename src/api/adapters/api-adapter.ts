/**
 * API Adapter - единая точка общения фронта с бэкендом
 */

import type {
  Token,
  SpreadResponse,
  TimeframeOption,
  MexcTradingLimits,
  StraightData,
  AllPrices,
} from '@/types';
import { logger } from '@/utils/logger';
import {
  requestDeduplicator,
  createDeduplicationKey,
} from '@/utils/request-deduplication';
import { withRateLimitRetry, isRateLimitError } from '@/utils/rate-limiting';
import {
  filterByToken,
  extractValidPrices,
  calculateAveragePrice,
  extractBestSpread,
  chainToNetwork,
} from './utils/token-utils';
import type { WebSocketParams } from './utils/websocket-client';
import { fetchStraightSpreadsInternal } from './websocket-fetcher';
import {
  getConnectionStatus,
  subscribeToConnectionStatus,
  type ConnectionStatus,
} from './connection-status';
import { MockApiAdapter } from '../mocks/mock-adapter';

// Реэкспортируем для обратной совместимости
export { getConnectionStatus, subscribeToConnectionStatus };
export type { ConnectionStatus };

/**
 * Интерфейс для API адаптера
 * Определяет контракт для всех методов работы с API бэкенда
 */
export interface IApiAdapter {
  /**
   * Получить все доступные токены
   * @param signal - AbortSignal для отмены запроса
   * @returns Promise с массивом токенов и их данными о спредах
   */
  getAllTokens(signal?: AbortSignal): Promise<StraightData[]>;

  /**
   * Получить все цены для указанного токена из разных источников
   * @param token - Токен для получения цен (symbol и chain)
   * @param signal - AbortSignal для отмены запроса
   * @returns Promise с ценами из всех источников (Jupiter, PancakeSwap, MEXC)
   */
  getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices>;

  /**
   * Получить данные спреда для токена с историей
   * @param token - Токен для получения данных спреда
   * @param timeframe - Таймфрейм для исторических данных (по умолчанию '1h')
   * @param signal - AbortSignal для отмены запроса
   * @returns Promise с данными спреда включая историю и текущие значения
   */
  getSpreadData(
    token: Token,
    timeframe?: TimeframeOption,
    signal?: AbortSignal
  ): Promise<SpreadResponse>;

  /**
   * Получить спреды для нескольких токенов одновременно
   * @param tokens - Массив токенов для получения спредов
   * @param signal - AbortSignal для отмены запроса
   * @param maxTokens - Максимальное количество токенов для обработки (опционально)
   * @returns Promise с массивом токенов, дополненных данными о спредах и ценах
   */
  getSpreadsForTokens(
    tokens: Token[],
    signal?: AbortSignal,
    maxTokens?: number
  ): Promise<
    Array<
      Token & {
        directSpread: number | null;
        reverseSpread: number | null;
        price: number | null;
      }
    >
  >;

  /**
   * Получить лимиты торговли MEXC для токена
   * @param symbol - Символ токена
   * @param signal - AbortSignal для отмены запроса
   * @returns Promise с лимитами торговли или null если не доступны
   * @note В текущей версии бэкенд не предоставляет эту информацию, всегда возвращает null
   */
  getMexcTradingLimits(
    symbol: string,
    signal?: AbortSignal
  ): Promise<MexcTradingLimits | null>;
}

// Константы
const CACHE_TTL = 5000; // 5 секунд - время жизни кэша

// Кэш для всех токенов (используется для оптимизации)
let cachedAllTokens: StraightData[] | null = null;
let cachedAllTokensTimestamp: number = 0;

/**
 * Публичная функция для получения данных straight spread с дедупликацией и кэшированием
 *
 * Использует WebSocket соединение для получения данных в реальном времени.
 * Автоматически переключается на HTTP fallback если WebSocket недоступен.
 *
 * @param params - Параметры для фильтрации данных (token, network, signal)
 * @returns Promise с массивом данных о спредах
 *
 * @example
 * ```ts
 * // Получить все токены
 * const allTokens = await fetchStraightSpreads({});
 *
 * // Получить конкретный токен
 * const btcTokens = await fetchStraightSpreads({ token: 'BTC' });
 *
 * // Получить токены конкретной сети
 * const solanaTokens = await fetchStraightSpreads({ network: 'solana' });
 * ```
 *
 * @note Когда бэкенд реализует /socket/sharkReverse, будет создана аналогичная функция
 * fetchReverseSpreads с той же логикой (дедупликация, кэширование, WebSocket/HTTP fallback)
 */
async function fetchStraightSpreads(
  params: WebSocketParams
): Promise<StraightData[]> {
  // Если запрашиваются все токены без фильтров, проверяем кэш
  if (!params.token && !params.network) {
    const now = Date.now();
    if (cachedAllTokens && now - cachedAllTokensTimestamp < CACHE_TTL) {
      logger.debug(
        `[API] Using cached all tokens (${cachedAllTokens.length} items)`
      );
      return cachedAllTokens;
    }
  }

  // Создаем ключ для дедупликации
  const dedupeKey = createDeduplicationKey('fetchStraightSpreads', {
    token: params.token || '',
    network: params.network || '',
  });

  // Выполняем запрос с дедупликацией
  const result = await requestDeduplicator.deduplicate(dedupeKey, () =>
    fetchStraightSpreadsInternal(params)
  );

  // Обновляем кэш если получили все токены
  if (!params.token && !params.network && result.length > 0) {
    cachedAllTokens = result;
    cachedAllTokensTimestamp = Date.now();
    logger.debug(`[API] Cached all tokens (${result.length} items)`);
  }

  return result;
}

/**
 * Backend‑реализация адаптера.
 * Использует WebSocket соединение для получения данных от бэкенда.
 */
class BackendApiAdapter implements IApiAdapter {
  /**
   * @inheritdoc
   */
  async getAllTokens(signal?: AbortSignal): Promise<StraightData[]> {
    logger.info('[API] getAllTokens called');
    try {
      // Используем fetchStraightSpreads с обработкой rate limiting
      const rows = await withRateLimitRetry(
        () => fetchStraightSpreads({ signal }),
        3, // max retries
        1000 // base delay
      );

      logger.debug(`[API] fetchStraightSpreads returned ${rows.length} rows`);

      // Если WebSocket вернул пустой результат - возвращаем пустой массив
      if (rows.length === 0) {
        logger.warn(
          '[API] WebSocket returned empty result - no data available'
        );
        logger.debug('[API] Returning empty array to React Query');
        return [];
      }

      // Возвращаем данные без изменений
      logger.info(`[API] Loaded ${rows.length} tokens from backend`);
      logger.debug('[API] Returning tokens to React Query:', {
        count: rows.length,
        firstToken: rows[0]?.token || 'none',
        sample: rows.slice(0, 3).map((r) => ({
          token: r.token,
          network: r.network,
          spread: r.spread,
        })),
      });
      return rows;
    } catch (error) {
      logger.error('[API] Error in getAllTokens:', error);

      // Если это rate limit ошибка, пробрасываем её для специальной обработки
      if (isRateLimitError(error)) {
        throw error;
      }

      // Возвращаем пустой массив вместо выбрасывания ошибки
      // Это позволяет React Query не делать retry при ошибках подключения
      return [];
    }
  }

  /**
   * @inheritdoc
   */
  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    const rows = await withRateLimitRetry(
      () =>
        fetchStraightSpreads({
          token: token.symbol,
          network: chainToNetwork(token.chain),
          signal,
        }),
      3,
      1000
    );

    const relevant = filterByToken(rows, token);

    // Собираем цены для каждой биржи отдельно
    const jupiterPrices: number[] = [];
    const pancakeswapPrices: number[] = [];
    const mexcPrices: number[] = [];

    for (const row of relevant) {
      const aExchange = row.aExchange?.toLowerCase() || '';
      const bExchange = row.bExchange?.toLowerCase() || '';

      // Определяем биржи и собираем цены
      if (aExchange.includes('jupiter')) {
        const priceA = row.priceA ? Number(row.priceA) : null;
        if (priceA != null && Number.isFinite(priceA) && priceA > 0) {
          jupiterPrices.push(priceA);
        }
      }
      if (bExchange.includes('jupiter')) {
        const priceB = row.priceB ? Number(row.priceB) : null;
        if (priceB != null && Number.isFinite(priceB) && priceB > 0) {
          jupiterPrices.push(priceB);
        }
      }

      if (aExchange.includes('pancake') || aExchange.includes('pancakeswap')) {
        const priceA = row.priceA ? Number(row.priceA) : null;
        if (priceA != null && Number.isFinite(priceA) && priceA > 0) {
          pancakeswapPrices.push(priceA);
        }
      }
      if (bExchange.includes('pancake') || bExchange.includes('pancakeswap')) {
        const priceB = row.priceB ? Number(row.priceB) : null;
        if (priceB != null && Number.isFinite(priceB) && priceB > 0) {
          pancakeswapPrices.push(priceB);
        }
      }

      if (aExchange.includes('mexc')) {
        const priceA = row.priceA ? Number(row.priceA) : null;
        if (priceA != null && Number.isFinite(priceA) && priceA > 0) {
          mexcPrices.push(priceA);
        }
      }
      if (bExchange.includes('mexc')) {
        const priceB = row.priceB ? Number(row.priceB) : null;
        if (priceB != null && Number.isFinite(priceB) && priceB > 0) {
          mexcPrices.push(priceB);
        }
      }
    }

    const jupiterPrice = calculateAveragePrice(jupiterPrices);
    const pancakeswapPrice = calculateAveragePrice(pancakeswapPrices);
    const mexcPrice = calculateAveragePrice(mexcPrices);

    return {
      symbol: token.symbol,
      chain: token.chain,
      jupiter:
        jupiterPrice != null
          ? {
              price: jupiterPrice,
              bid: null,
              ask: null,
              timestamp: Date.now(),
              source: 'jupiter',
            }
          : null,
      pancakeswap:
        pancakeswapPrice != null
          ? {
              price: pancakeswapPrice,
              bid: null,
              ask: null,
              timestamp: Date.now(),
              source: 'pancakeswap',
            }
          : null,
      mexc:
        mexcPrice != null
          ? {
              price: mexcPrice,
              bid: null,
              ask: null,
              timestamp: Date.now(),
              source: 'mexc',
            }
          : null,
      timestamp: Date.now(),
    };
  }

  /**
   * @inheritdoc
   * @note Параметр timeframe в текущей версии не поддерживается бэкендом
   * и оставлен для совместимости с интерфейсом
   */
  async getSpreadData(
    token: Token,
    timeframe: TimeframeOption = '1h',
    signal?: AbortSignal
  ): Promise<SpreadResponse> {
    // Примечание: параметр timeframe не поддерживается бэкендом API
    // Бэкенд возвращает только текущие данные без исторических данных по таймфреймам
    // Параметр оставлен для совместимости с интерфейсом, но не используется в запросе
    // В будущем, если бэкенд добавит поддержку timeframe, его можно будет использовать
    void timeframe; // Помечаем как использованный для избежания ESLint предупреждения

    const rows = await withRateLimitRetry(
      () =>
        fetchStraightSpreads({
          token: token.symbol,
          network: chainToNetwork(token.chain),
          signal,
        }),
      3,
      1000
    );

    const relevant = filterByToken(rows, token);
    // Проверяем, что массив не пустой перед доступом к элементу
    if (relevant.length === 0) {
      logger.warn('[API] No data found for token:', token);
      return {
        symbol: token.symbol,
        chain: token.chain,
        history: [],
        current: null,
        sources: {
          mexc: false,
          jupiter: false,
          pancakeswap: false,
        },
      };
    }
    const latest = relevant[0];
    const now = Date.now();

    // Преобразуем строки в числа
    const priceA = latest?.priceA ? Number(latest.priceA) : null;
    const priceB = latest?.priceB ? Number(latest.priceB) : null;

    // Определяем какая биржа какая по aExchange/bExchange
    const isJupiterA = latest?.aExchange?.toLowerCase().includes('jupiter');
    const isMEXCB = latest?.bExchange?.toLowerCase().includes('mexc');

    const current =
      latest && (priceA != null || priceB != null)
        ? {
            timestamp: now,
            mexc_bid: null,
            mexc_ask: null,
            mexc_price: isMEXCB ? priceB : isJupiterA ? null : priceB,
            jupiter_price: isJupiterA ? priceA : null,
            pancakeswap_price: null,
          }
        : null;

    const history =
      current != null
        ? [
            {
              timestamp: current.timestamp,
              mexc_price: current.mexc_price,
              mexc_bid: current.mexc_bid,
              mexc_ask: current.mexc_ask,
              jupiter_price: current.jupiter_price,
              pancakeswap_price: current.pancakeswap_price,
            },
          ]
        : [];

    return {
      symbol: token.symbol,
      chain: token.chain,
      history,
      current,
      sources: {
        mexc: current?.mexc_price != null,
        jupiter: current?.jupiter_price != null,
        pancakeswap: current?.pancakeswap_price != null,
      },
    };
  }

  /**
   * @inheritdoc
   */
  async getSpreadsForTokens(
    tokens: Token[],
    signal?: AbortSignal,
    _maxTokens?: number
  ): Promise<
    Array<
      Token & {
        directSpread: number | null;
        reverseSpread: number | null;
        price: number | null;
      }
    >
  > {
    if (!tokens.length) return [];

    // Оптимизация: если запрашиваются все токены, используем кэш
    // Это позволяет избежать дублирования запросов когда getAllTokens и getSpreadsForTokens вызываются одновременно
    const rows = await withRateLimitRetry(
      () => fetchStraightSpreads({ signal }),
      3,
      1000
    );

    const byKey = new Map<
      string,
      {
        token: Token;
        directSpread: number | null;
        reverseSpread: number | null;
        price: number | null;
      }
    >();

    for (const token of tokens) {
      const key = `${token.symbol.toUpperCase()}-${token.chain}`;
      const matches = filterByToken(rows, token);

      if (!matches.length) continue;

      const priceCandidates: number[] = [];
      for (const row of matches) {
        priceCandidates.push(...extractValidPrices(row));
      }

      const price = calculateAveragePrice(priceCandidates);
      const bestSpread = extractBestSpread(matches);

      byKey.set(key, {
        token,
        directSpread: bestSpread,
        reverseSpread: null, // Будет заполняться из /socket/sharkReverse когда endpoint будет реализован на бэкенде
        price,
      });
    }

    return Array.from(byKey.values()).map(({ token, ...rest }) => ({
      ...token,
      ...rest,
    }));
  }

  /**
   * @inheritdoc
   * @note В текущей версии бэкенд не предоставляет информацию о лимитах торговли MEXC.
   * Метод всегда возвращает null и оставлен для совместимости с интерфейсом.
   */
  async getMexcTradingLimits(
    _symbol: string,
    _signal?: AbortSignal
  ): Promise<MexcTradingLimits | null> {
    void _symbol; // Помечаем как использованный для избежания ESLint предупреждения
    void _signal; // Помечаем как использованный для избежания ESLint предупреждения
    return null;
  }
}

/**
 * Определяем, использовать ли мок-данные
 * Включается через переменную окружения VITE_USE_MOCK_DATA=true
 */
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Создаем единственный экземпляр адаптера
// В dev режиме можно использовать мок-данные для разработки UI без бэкенда
const apiAdapter: IApiAdapter = USE_MOCK_DATA
  ? new MockApiAdapter()
  : new BackendApiAdapter();

if (USE_MOCK_DATA) {
  logger.info('🎭 [API] Using MOCK data adapter for development');
  logger.info('🎭 [API] Set VITE_USE_MOCK_DATA=false to use real backend');
}

/**
 * Получить все доступные токены
 * @param signal - AbortSignal для отмены запроса
 * @returns Promise с массивом токенов и их данными о спредах
 * @example
 * ```ts
 * const tokens = await getAllTokens();
 * console.log(`Loaded ${tokens.length} tokens`);
 * ```
 */
export const getAllTokens = async (signal?: AbortSignal) => {
  return apiAdapter.getAllTokens(signal);
};

/**
 * Получить все цены для указанного токена из разных источников
 * @param token - Токен для получения цен (symbol и chain)
 * @param signal - AbortSignal для отмены запроса
 * @returns Promise с ценами из всех источников (Jupiter, PancakeSwap, MEXC)
 * @example
 * ```ts
 * const prices = await getAllPrices({ symbol: 'BTC', chain: 'solana' });
 * console.log('Jupiter price:', prices.jupiter?.price);
 * ```
 */
export const getAllPrices = async (token: Token, signal?: AbortSignal) => {
  return apiAdapter.getAllPrices(token, signal);
};

/**
 * Получить данные спреда для токена с историей
 * @param token - Токен для получения данных спреда
 * @param timeframe - Таймфрейм для исторических данных (по умолчанию '1h')
 * @param signal - AbortSignal для отмены запроса
 * @returns Promise с данными спреда включая историю и текущие значения
 * @example
 * ```ts
 * const spreadData = await getSpreadData(
 *   { symbol: 'BTC', chain: 'solana' },
 *   '1h'
 * );
 * console.log('Current spread:', spreadData.current);
 * ```
 */
export const getSpreadData = async (
  token: Token,
  timeframe: TimeframeOption = '1h',
  signal?: AbortSignal
) => {
  return apiAdapter.getSpreadData(token, timeframe, signal);
};

/**
 * Получить спреды для нескольких токенов одновременно
 * @param tokens - Массив токенов для получения спредов
 * @param signal - AbortSignal для отмены запроса
 * @param maxTokens - Максимальное количество токенов для обработки (опционально)
 * @returns Promise с массивом токенов, дополненных данными о спредах и ценах
 * @example
 * ```ts
 * const tokensWithSpreads = await getSpreadsForTokens([
 *   { symbol: 'BTC', chain: 'solana' },
 *   { symbol: 'ETH', chain: 'solana' }
 * ]);
 * ```
 */
export const getSpreadsForTokens = async (
  tokens: Token[],
  signal?: AbortSignal,
  maxTokens?: number
) => {
  return apiAdapter.getSpreadsForTokens(tokens, signal, maxTokens);
};

/**
 * Получить лимиты торговли MEXC для токена
 * @param symbol - Символ токена
 * @param signal - AbortSignal для отмены запроса
 * @returns Promise с лимитами торговли или null если не доступны
 * @note В текущей версии бэкенд не предоставляет эту информацию, всегда возвращает null
 * @example
 * ```ts
 * const limits = await getMexcTradingLimits('BTC');
 * if (limits) {
 *   console.log('Min notional:', limits.minNotional);
 * }
 * ```
 */
export const getMexcTradingLimits = async (
  symbol: string,
  signal?: AbortSignal
) => {
  return apiAdapter.getMexcTradingLimits(symbol, signal);
};

// Экспортируем адаптер для обратной совместимости
export { apiAdapter };
