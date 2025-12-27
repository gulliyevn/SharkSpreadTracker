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
import { WEBSOCKET_URL, BACKEND_URL } from '@/constants/api';
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
import {
  createWebSocketUrl,
  parseWebSocketMessage,
  type WebSocketParams,
} from './utils/websocket-client';

// Состояние соединения для экспорта
export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error';
let currentConnectionStatus: ConnectionStatus = 'disconnected';
const connectionStatusListeners: Set<(status: ConnectionStatus) => void> =
  new Set();

export function getConnectionStatus(): ConnectionStatus {
  return currentConnectionStatus;
}

export function subscribeToConnectionStatus(
  listener: (status: ConnectionStatus) => void
): () => void {
  connectionStatusListeners.add(listener);
  // Сразу вызываем с текущим статусом
  listener(currentConnectionStatus);
  return () => connectionStatusListeners.delete(listener);
}

function setConnectionStatus(status: ConnectionStatus) {
  if (currentConnectionStatus !== status) {
    currentConnectionStatus = status;
    connectionStatusListeners.forEach((listener) => listener(status));
    logger.debug(`[API] Connection status changed: ${status}`);
  }
}

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
const WS_TIMEOUT = 10000; // 10 секунд - таймаут для WebSocket (согласно API, соединение закрывается сразу после отправки данных)
const CACHE_TTL = 5000; // 5 секунд - время жизни кэша
const DATA_RECEIVED_DELAY = 500; // 500мс задержка для обработки всех сообщений
const HTTP_FALLBACK_TIMEOUT = 10000; // 10 секунд - таймаут для HTTP fallback запроса

// Кэш для всех токенов (используется для оптимизации)
let cachedAllTokens: StraightData[] | null = null;
let cachedAllTokensTimestamp: number = 0;

/**
 * HTTP fallback для случая, когда WebSocket не обновился
 * Согласно документации API, если WebSocket не обновился, бэкенд возвращает HTTP 200 с JSON
 */
async function fetchStraightSpreadsHttpFallback(
  url: URL,
  params: WebSocketParams
): Promise<StraightData[]> {
  // Простая логика: используем BACKEND_URL напрямую
  if (!BACKEND_URL) {
    logger.error('[HTTP Fallback] BACKEND_URL not configured');
    return [];
  }

  // Формируем HTTP URL из BACKEND_URL
  const httpUrl = new URL(`${BACKEND_URL}/socket/sharkStraight`);

  // Добавляем query параметры из WebSocket URL
  url.searchParams.forEach((value, key) => {
    httpUrl.searchParams.set(key, value);
  });

  logger.info(
    `[HTTP Fallback] Trying HTTP GET request to: ${httpUrl.toString()}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HTTP_FALLBACK_TIMEOUT
    );

    if (params.signal) {
      params.signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }

    const response = await fetch(httpUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(
        `[HTTP Fallback] HTTP request failed with status ${response.status}`
      );
      return [];
    }

    const data = await response.json();
    logger.info('[HTTP Fallback] Received data via HTTP:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 1,
    });

    // Парсим данные так же, как WebSocket сообщения
    // parseWebSocketMessage ожидает строку, поэтому преобразуем JSON обратно в строку
    const rows = parseWebSocketMessage(JSON.stringify(data));

    logger.info(
      `[HTTP Fallback] Successfully parsed ${rows.length} rows from HTTP response`
    );
    return rows;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.debug('[HTTP Fallback] Request aborted');
    } else {
      logger.error('[HTTP Fallback] HTTP request failed:', err);
    }
    return [];
  }
}

/**
 * Внутренняя функция для выполнения WebSocket запроса
 */
async function _fetchStraightSpreadsInternal(
  params: WebSocketParams
): Promise<StraightData[]> {
  if (!WEBSOCKET_URL) {
    logger.error(
      '[WebSocket] WEBSOCKET_URL not configured. Please set VITE_WEBSOCKET_URL or VITE_BACKEND_URL'
    );
    setConnectionStatus('error');
    return [];
  }

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    logger.warn('[WebSocket] WebSocket not available, using HTTP fallback');
    const url = createWebSocketUrl(WEBSOCKET_URL, params);
    return await fetchStraightSpreadsHttpFallback(url, params);
  }

  // ВРЕМЕННО: для диагностики используем HTTP fallback сразу
  // Если WebSocket не работает, используем HTTP напрямую
  const useHttpDirectly = import.meta.env.VITE_USE_HTTP_FALLBACK === 'true';
  
  if (useHttpDirectly) {
    logger.info('[WebSocket] Using HTTP fallback directly (VITE_USE_HTTP_FALLBACK=true)');
    const url = createWebSocketUrl(WEBSOCKET_URL, params);
    setConnectionStatus('connecting');
    const result = await fetchStraightSpreadsHttpFallback(url, params);
    if (result.length > 0) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
    return result;
  }

  logger.info(`[WebSocket] Connecting to: ${WEBSOCKET_URL}`);
  setConnectionStatus('connecting');

  const url = createWebSocketUrl(WEBSOCKET_URL, params);

  return new Promise<StraightData[]>((resolve) => {
    let settled = false;
    const rows: StraightData[] = [];
    let messageCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let httpFallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const ws = new WebSocket(url.toString());
    
    // Настраиваем WebSocket для больших сообщений
    // binaryType: 'blob' позволяет обрабатывать большие сообщения как Blob
    ws.binaryType = 'blob';

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (httpFallbackTimeout) {
        clearTimeout(httpFallbackTimeout);
        httpFallbackTimeout = null;
      }
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // Игнорируем ошибки закрытия
      }
    };

    const finish = (result: StraightData[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (result.length > 0) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
      resolve(result);
    };

    // Таймаут для автоматического переключения на HTTP fallback через 5 секунд
    httpFallbackTimeout = setTimeout(async () => {
      if (settled || rows.length > 0) {
        logger.debug('[WebSocket] HTTP fallback timeout skipped - already settled or has data');
        return;
      }
      logger.warn('[WebSocket] ⏱️ No data received in 30 seconds, switching to HTTP fallback...');
      logger.info('[WebSocket] WebSocket stats before fallback:', {
        messageCount,
        rowsCount: rows.length,
        readyState: ws.readyState,
        url: url.toString(),
      });
      cleanup();
      try {
        logger.info('[WebSocket] Starting HTTP fallback request...');
        const httpResult = await fetchStraightSpreadsHttpFallback(url, params);
        logger.info(`[WebSocket] HTTP fallback returned ${httpResult.length} rows`);
        finish(httpResult);
      } catch (err) {
        logger.error('[WebSocket] HTTP fallback failed:', err);
        finish([]);
      }
    }, WS_TIMEOUT);

    // Общий таймаут на случай если HTTP fallback тоже не сработает
    // 30s WebSocket + 10s HTTP = 40 секунд
    timeoutId = setTimeout(() => {
      if (!settled) {
        logger.warn('[WebSocket] Overall timeout reached (40 seconds)');
        finish(rows);
      }
    }, WS_TIMEOUT + HTTP_FALLBACK_TIMEOUT);

    if (params.signal) {
      if (params.signal.aborted) {
        finish([]);
        return;
      }
      params.signal.addEventListener('abort', () => finish([]), { once: true });
    }

    const handleMessage = (newRows: StraightData[]) => {
      for (const row of newRows) {
        rows.push(row);
      }
      messageCount++;

      logger.info(`[WebSocket] Received ${newRows.length} rows, total: ${rows.length}`);

      // Если получили данные, отменяем HTTP fallback и завершаем через небольшую задержку
      if (rows.length > 0 && httpFallbackTimeout) {
        clearTimeout(httpFallbackTimeout);
        httpFallbackTimeout = null;
        setTimeout(() => {
          if (!settled) {
            finish(rows);
          }
        }, DATA_RECEIVED_DELAY);
      }
    };

    ws.onopen = () => {
      const openTime = Date.now();
      logger.info('[WebSocket] ✅ Connected successfully!');
      logger.info('[WebSocket] WebSocket readyState:', ws.readyState);
      logger.info('[WebSocket] WebSocket protocol:', ws.protocol || 'none');
      logger.info('[WebSocket] WebSocket extensions:', ws.extensions || 'none');
      logger.info('[WebSocket] Waiting for data... (will switch to HTTP fallback in 30 seconds if no data)');
      logger.info('[WebSocket] WebSocket binaryType:', ws.binaryType);
      setConnectionStatus('connected');
      
      // Согласно документации, сервер отправляет данные сразу после handshake
      // Логируем каждую секунду, чтобы видеть, что происходит
      const checkInterval = setInterval(() => {
        if (settled) {
          clearInterval(checkInterval);
          return;
        }
        const timeSinceOpen = Date.now() - openTime;
        logger.info('[WebSocket] Status check:', {
          readyState: ws.readyState,
          messageCount,
          rowsCount: rows.length,
          timeSinceOpen: `${timeSinceOpen}ms`,
        });
      }, 1000);
      
      // Очищаем интервал при закрытии
      ws.addEventListener('close', () => clearInterval(checkInterval), { once: true });
    };

    ws.onmessage = async (event) => {
      messageCount++;
      logger.info(`[WebSocket] 📩 Message received (message #${messageCount})`);
      logger.info('[WebSocket] Message type:', typeof event.data);
      logger.info('[WebSocket] Message constructor:', event.data?.constructor?.name);
      
      let textData: string;
      
      // Обрабатываем и строки, и Blob
      if (typeof event.data === 'string') {
        textData = event.data;
        logger.info('[WebSocket] String message length:', textData.length);
      } else if (event.data instanceof Blob) {
        logger.info('[WebSocket] Blob message received, size:', event.data.size, 'bytes');
        logger.info('[WebSocket] Converting Blob to text...');
        try {
          textData = await event.data.text();
          logger.info('[WebSocket] Blob converted to text, length:', textData.length);
        } catch (err) {
          logger.error('[WebSocket] Failed to convert Blob to text:', err);
          return;
        }
      } else if (event.data instanceof ArrayBuffer) {
        logger.info('[WebSocket] ArrayBuffer message received, size:', event.data.byteLength, 'bytes');
        logger.info('[WebSocket] Converting ArrayBuffer to text...');
        try {
          textData = new TextDecoder().decode(event.data);
          logger.info('[WebSocket] ArrayBuffer converted to text, length:', textData.length);
        } catch (err) {
          logger.error('[WebSocket] Failed to convert ArrayBuffer to text:', err);
          return;
        }
      } else {
        logger.warn('[WebSocket] ⚠️ Unknown message type:', typeof event.data, event.data?.constructor?.name);
        return;
      }

      // Логируем первые 500 символов для диагностики
      logger.info('[WebSocket] Message preview (first 500 chars):', textData.slice(0, 500));
      if (textData.length > 500) {
        logger.info('[WebSocket] Message is very large, total length:', textData.length, 'chars');
      }

      // Парсим данные
      try {
        logger.info('[WebSocket] Parsing message...');
        const parsedRows = parseWebSocketMessage(textData);
        logger.info(`[WebSocket] ✅ Parsed ${parsedRows.length} rows from message`);
        if (parsedRows.length > 0) {
          logger.info('[WebSocket] First row sample:', {
            token: parsedRows[0]?.token,
            network: parsedRows[0]?.network,
            spread: parsedRows[0]?.spread,
          });
        }
        handleMessage(parsedRows);
      } catch (err) {
        logger.error('[WebSocket] ❌ Failed to parse message:', err);
        logger.error('[WebSocket] Raw message preview:', textData.slice(0, 1000));
        // При ошибке парсинга завершаем Promise с пустым массивом
        // Это позволяет пользователю увидеть, что данные не получены
        if (!settled) {
          logger.warn('[WebSocket] Finishing with empty array due to parse error');
          finish([]);
        }
      }
    };

    ws.onerror = (error) => {
      logger.error('[WebSocket] ❌ Error event triggered');
      logger.error('[WebSocket] Error details:', error);
      logger.error('[WebSocket] WebSocket readyState:', ws.readyState);
      setConnectionStatus('error');
      // onclose обработает завершение
    };

    ws.onclose = (event) => {
      logger.info(
        `[WebSocket] 🔌 Closed: code=${event.code}, reason="${event.reason || ''}", received ${messageCount} messages, ${rows.length} rows`
      );
      logger.info('[WebSocket] Close event details:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        settled,
        messageCount,
        rowsCount: rows.length,
      });

      // Если соединение закрылось без данных и мы еще не settled
      if (!settled) {
        if (rows.length > 0) {
          logger.info('[WebSocket] Connection closed but we have data, finishing...');
          finish(rows);
        } else {
          // Если нет данных и соединение закрылось, HTTP fallback обработает это через таймаут
          logger.warn('[WebSocket] ⚠️ Connection closed without receiving any messages!');
          logger.warn('[WebSocket] This usually means the server closed the connection before sending data');
          logger.info('[WebSocket] Waiting for HTTP fallback timeout...');
          setConnectionStatus('disconnected');
        }
      } else {
        logger.debug('[WebSocket] Connection closed but already settled');
      }
    };
  });
}

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
    _fetchStraightSpreadsInternal(params)
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

    const priceCandidates: number[] = [];
    for (const row of rows) {
      priceCandidates.push(...extractValidPrices(row));
    }

    const price = calculateAveragePrice(priceCandidates);

    return {
      symbol: token.symbol,
      chain: token.chain,
      jupiter:
        price != null
          ? {
              price,
              bid: null,
              ask: null,
              timestamp: Date.now(),
              source: 'jupiter',
            }
          : null,
      pancakeswap: null,
      mexc: null,
      timestamp: Date.now(),
    };
  }

  async getSpreadData(
    token: Token,
    _timeframe: TimeframeOption = '1h',
    signal?: AbortSignal
  ): Promise<SpreadResponse> {
    const rows = await fetchStraightSpreads({
      token: token.symbol,
      network: chainToNetwork(token.chain),
      signal,
    });

    const relevant = filterByToken(rows, token);
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
    return null;
  }
}

// Создаем единственный экземпляр адаптера
const apiAdapter: IApiAdapter = new BackendApiAdapter();

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
