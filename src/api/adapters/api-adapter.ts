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
 */
export interface IApiAdapter {
  // Tokens
  getAllTokens(signal?: AbortSignal): Promise<StraightData[]>;

  // Prices
  getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices>;

  // Spreads
  getSpreadData(
    token: Token,
    timeframe?: TimeframeOption,
    signal?: AbortSignal
  ): Promise<SpreadResponse>;
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

  // MEXC Limits
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
 * Примечание: Когда бэкенд реализует /socket/sharkReverse, будет создана аналогичная функция
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
 */
class BackendApiAdapter implements IApiAdapter {
  async getAllTokens(signal?: AbortSignal): Promise<StraightData[]> {
    logger.debug('[API] getAllTokens called');
    console.log('📞 [API] getAllTokens called');
    // Используем fetchStraightSpreads который уже имеет кэширование и дедупликацию
    const rows = await fetchStraightSpreads({ signal });

    logger.debug(`[API] fetchStraightSpreads returned ${rows.length} rows`);

    // Если WebSocket вернул пустой результат - возвращаем пустой массив
    if (rows.length === 0) {
      logger.warn('[API] WebSocket returned empty result - no data available');
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
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    const rows = await fetchStraightSpreads({
      token: token.symbol,
      network: chainToNetwork(token.chain),
      signal,
    });

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

    const rows = await fetchStraightSpreads({
      token: token.symbol,
      network: chainToNetwork(token.chain),
      signal,
    });

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
    const rows = await fetchStraightSpreads({ signal });

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

  async getMexcTradingLimits(
    _symbol: string,
    _signal?: AbortSignal
  ): Promise<MexcTradingLimits | null> {
    // Примечание: Бэкенд API не предоставляет информацию о лимитах торговли MEXC
    // Метод оставлен для совместимости с интерфейсом, но всегда возвращает null
    // В будущем, если бэкенд добавит endpoint для получения лимитов MEXC, его можно будет использовать
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
  console.log('🎭 [API] Using MOCK data adapter for development');
  console.log('🎭 [API] Set VITE_USE_MOCK_DATA=false to use real backend');
}

/**
 * Экспортируем функции для удобства использования
 */
export const getAllTokens = async (signal?: AbortSignal) => {
  return apiAdapter.getAllTokens(signal);
};

export const getAllPrices = async (token: Token, signal?: AbortSignal) => {
  return apiAdapter.getAllPrices(token, signal);
};

export const getSpreadData = async (
  token: Token,
  timeframe: TimeframeOption = '1h',
  signal?: AbortSignal
) => {
  return apiAdapter.getSpreadData(token, timeframe, signal);
};

export const getSpreadsForTokens = async (
  tokens: Token[],
  signal?: AbortSignal,
  maxTokens?: number
) => {
  return apiAdapter.getSpreadsForTokens(tokens, signal, maxTokens);
};

export const getMexcTradingLimits = async (
  symbol: string,
  signal?: AbortSignal
) => {
  return apiAdapter.getMexcTradingLimits(symbol, signal);
};

// Экспортируем адаптер для обратной совместимости
export { apiAdapter };
