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
import { WEBSOCKET_URL } from '@/constants/api';
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
  processWebSocketData,
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
const WS_TIMEOUT = 60000; // 60 секунд (1 минута) - таймаут для WebSocket соединения
const MAX_RECONNECT_ATTEMPTS = 3; // Максимум попыток реконнекта
const CACHE_TTL = 5000; // 5 секунд - время жизни кэша
const DATA_RECEIVED_DELAY = 500; // 500мс задержка для обработки всех сообщений (увеличено чтобы дать серверу время отправить данные)

// Кэш для всех токенов (используется для оптимизации)
let cachedAllTokens: StraightData[] | null = null;
let cachedAllTokensTimestamp: number = 0;

/**
 * Внутренняя функция для выполнения WebSocket запроса
 */
async function _fetchStraightSpreadsInternal(
  params: WebSocketParams & {
    _reconnectAttempt?: number;
  }
): Promise<StraightData[]> {
  const reconnectAttempt = params._reconnectAttempt ?? 0;

  if (!WEBSOCKET_URL) {
    const errorMsg =
      'WEBSOCKET_URL not configured. Please set VITE_WEBSOCKET_URL or VITE_BACKEND_URL environment variable.';
    logger.error('[WebSocket]', errorMsg);
    logger.error('[WebSocket] Environment variables:', {
      VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'not set',
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'not set',
    });
    setConnectionStatus('error');
    return [];
  }

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    logger.warn('[WebSocket] WebSocket not available');
    setConnectionStatus('error');
    return [];
  }

  logger.info(`[WebSocket] Connecting to: ${WEBSOCKET_URL}`);
  logger.debug(`[WebSocket] Environment check:`, {
    VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL,
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL
      ? `${import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws')}/socket/sharkStraight`
      : 'not set',
    final_WEBSOCKET_URL: WEBSOCKET_URL,
  });
  setConnectionStatus('connecting');

  const url = createWebSocketUrl(WEBSOCKET_URL, params);
  logger.debug(`[WebSocket] Final connection URL: ${url.toString()}`);

  return new Promise<StraightData[]>((resolve) => {
    let settled = false;
    const rows: StraightData[] = [];
    let messageCount = 0;
    let dataReceivedTimeout: ReturnType<typeof setTimeout> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pendingBlobPromises: Promise<void>[] = []; // Отслеживаем асинхронные обработки Blob

    logger.debug(`[WebSocket] Opening connection to: ${url.toString()}`);
    logger.debug(`[WebSocket] Full URL breakdown:`, {
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    });

    const ws = new WebSocket(url.toString());

    // Логируем создание WebSocket для отладки
    logger.debug(
      '[WebSocket] WebSocket instance created, readyState:',
      ws.readyState,
      '(0 = CONNECTING)'
    );

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (dataReceivedTimeout) {
        clearTimeout(dataReceivedTimeout);
        dataReceivedTimeout = null;
      }
      // НЕ закрываем соединение вручную, если оно уже закрыто или закрывается
      // Позволяем серверу/браузеру управлять закрытием
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          logger.debug('[WebSocket] Cleanup: closing WebSocket connection');
          ws.close();
        } else {
          logger.debug(
            `[WebSocket] Cleanup: WebSocket already in state ${ws.readyState}, not closing`
          );
        }
      } catch (err) {
        logger.debug(
          '[WebSocket] Cleanup: error closing WebSocket (ignored):',
          err
        );
      }
    };

    const finish = (result: StraightData[]) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();

      logger.info(
        `[WebSocket] Finished with ${result.length} rows from ${messageCount} messages`
      );

      if (result.length > 0) {
        setConnectionStatus('connected');
      }

      resolve(result);
    };

    // Таймаут 1 минута (60 секунд)
    timeoutId = setTimeout(async () => {
      if (settled) return;
      settled = true;
      logger.warn(
        `[WebSocket] Timeout after ${WS_TIMEOUT}ms, received ${messageCount} messages, ${rows.length} rows`
      );
      setConnectionStatus('disconnected');
      cleanup();

      // Автоматический реконнект при таймауте
      if (
        reconnectAttempt < MAX_RECONNECT_ATTEMPTS &&
        !params.signal?.aborted
      ) {
        logger.debug(
          `[WebSocket] Timeout, reconnecting (attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})...`
        );
        const result = await fetchStraightSpreads({
          ...params,
          _reconnectAttempt: reconnectAttempt + 1,
        });
        resolve(result);
      } else {
        logger.error('[WebSocket] Max reconnect attempts reached, giving up');
        resolve(rows.length > 0 ? rows : []);
      }
    }, WS_TIMEOUT);

    if (params.signal) {
      if (params.signal.aborted) {
        finish([]);
        return;
      }
      params.signal.addEventListener('abort', () => finish([]), { once: true });
    }

    const handleMessage = (newRows: StraightData[]) => {
      const itemsAdded = newRows.length;

      logger.debug(
        `[WebSocket] handleMessage called with ${itemsAdded} rows from parser`
      );

      // Используем цикл вместо spread operator для избежания переполнения стека при больших массивах
      for (const row of newRows) {
        rows.push(row);
      }
      messageCount++;

      logger.info(
        `[WebSocket] Total rows so far: ${rows.length} (added ${itemsAdded} from this message)`
      );
      logger.debug('[WebSocket] Rows array state:', {
        totalRows: rows.length,
        messageCount,
        sample: rows.slice(0, 2).map((r) => ({
          token: r.token,
          network: r.network,
        })),
      });

      // Соединение остается открытым для вечного обновления данных
      // Разрешаем promise после получения первых данных, но НЕ закрываем соединение
      if (dataReceivedTimeout) {
        clearTimeout(dataReceivedTimeout);
      }
      dataReceivedTimeout = setTimeout(() => {
        if (!settled && rows.length > 0) {
          logger.info(
            `[WebSocket] Received ${rows.length} rows, resolving promise but keeping connection open for continuous updates`
          );
          // Разрешаем promise с данными, но НЕ закрываем соединение
          settled = true;
          // НЕ вызываем cleanup() - соединение остается открытым для дальнейших обновлений
          setConnectionStatus('connected');
          resolve(rows);
          // Соединение остается открытым, новые данные будут приходить через ws.onmessage
          // но promise уже resolved, поэтому новые данные не попадут в текущий запрос
          // Для вечного обновления нужно использовать другой механизм (например, refetch через React Query)
        } else if (!settled && rows.length === 0) {
          logger.debug(
            `[WebSocket] No data yet, connection will remain open and wait for data`
          );
        }
      }, DATA_RECEIVED_DELAY);
    };

    ws.onopen = () => {
      logger.info('[WebSocket] ✅ Connected successfully!');
      logger.debug('[WebSocket] readyState:', ws.readyState, '(1 = OPEN)');
      logger.debug('[WebSocket] URL:', url.toString());
      logger.debug('[WebSocket] Protocol:', ws.protocol || 'none');
      logger.debug('[WebSocket] Extensions:', ws.extensions || 'none');
      setConnectionStatus('connected');

      // Согласно документации API, сервер отправляет данные сразу после handshake
      // и затем закрывает соединение. Не нужно отправлять активационное сообщение.
      logger.debug(
        '[WebSocket] Waiting for data from server (server sends data immediately after handshake)...'
      );

      // Проверяем состояние соединения через разные интервалы
      // Логируем только важные интервалы, чтобы не засорять консоль
      const checkIntervals = [50, 100, 200, 500, 1000, 2000, 5000];
      checkIntervals.forEach((delay) => {
        setTimeout(() => {
          const state = ws.readyState;
          logger.debug(
            `[WebSocket] State check after ${delay}ms: readyState=${state} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED), messages=${messageCount}`
          );

          if (state === WebSocket.OPEN && messageCount === 0) {
            // Логируем только важные интервалы (>= 1 секунда)
            if (delay >= 1000) {
              logger.warn(
                `[WebSocket] ⚠️ Connection is OPEN but no messages received after ${delay}ms - server may not be sending data`
              );
            }
          }

          if (state === WebSocket.CLOSED || state === WebSocket.CLOSING) {
            logger.debug(
              `[WebSocket] Connection is ${state === WebSocket.CLOSED ? 'CLOSED' : 'CLOSING'} after ${delay}ms, messages received: ${messageCount}`
            );
          }
        }, delay);
      });
    };

    ws.onmessage = (event) => {
      logger.info(
        `[WebSocket] 📩 MESSAGE received (message #${messageCount + 1})`
      );
      logger.debug('[WebSocket] Message data type:', typeof event.data);
      logger.debug('[WebSocket] Message is Blob:', event.data instanceof Blob);
      logger.debug(
        '[WebSocket] Message is string:',
        typeof event.data === 'string'
      );
      logger.debug('[WebSocket] readyState during message:', ws.readyState);

      if (event.data instanceof Blob) {
        logger.debug('[WebSocket] Blob size:', event.data.size);
        logger.debug('[WebSocket] Blob type:', event.data.type);
      } else if (typeof event.data === 'string') {
        logger.debug('[WebSocket] String length:', event.data.length);
        logger.debug(
          '[WebSocket] String preview (first 200 chars):',
          event.data.slice(0, 200)
        );
        if (event.data.length > 0) {
          logger.debug(
            '[WebSocket] String preview (last 200 chars):',
            event.data.slice(-200)
          );
        }
      }

      // Обрабатываем данные синхронно для строк, асинхронно для Blob
      if (typeof event.data === 'string') {
        try {
          logger.debug('[WebSocket] Processing string message synchronously');
          logger.debug(
            '[WebSocket] Raw message length:',
            event.data.length,
            'chars'
          );
          const rows = parseWebSocketMessage(event.data);
          logger.debug(
            `[WebSocket] Parsed ${rows.length} rows from string message`
          );
          if (rows.length > 0) {
            logger.debug('[WebSocket] First parsed row sample:', {
              token: rows[0]?.token,
              network: rows[0]?.network,
            });
          }
          handleMessage(rows);
        } catch (err) {
          logger.error('[WebSocket] Failed to parse string message:', err);
        }
      } else if (event.data instanceof Blob) {
        logger.debug('[WebSocket] Processing Blob message asynchronously');
        const blobPromise = processWebSocketData(
          event.data,
          handleMessage
        ).catch((err) => {
          logger.error('[WebSocket] Failed to process Blob message:', err);
        });
        pendingBlobPromises.push(blobPromise);
        // Ждем завершения обработки Blob перед закрытием
        blobPromise.finally(() => {
          pendingBlobPromises = pendingBlobPromises.filter(
            (p) => p !== blobPromise
          );
        });
      } else {
        logger.error(
          '[WebSocket] Unknown data type:',
          typeof event.data,
          event.data
        );
      }
    };

    ws.onerror = async (error) => {
      logger.error('[WebSocket] ❌ Error event triggered');
      logger.error('[WebSocket] Error details:', {
        error,
        readyState: ws.readyState,
        url: ws.url,
        wasSettled: settled,
        messageCount,
      });
      setConnectionStatus('error');

      // НЕ устанавливаем settled = true здесь, так как onclose тоже должен сработать
      // Если соединение закрылось с ошибкой, onclose обработает завершение

      // НЕ делаем cleanup здесь, пусть onclose обработает это
    };

    ws.onclose = (event) => {
      logger.info(
        `[WebSocket] 🔌 Closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`
      );
      logger.info(
        `[WebSocket] Stats: received ${messageCount} messages, parsed ${rows.length} rows`
      );
      logger.debug(`[WebSocket] Close event details:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        wasSettled: settled,
        readyStateBeforeClose: ws.readyState,
      });

      if (event.code === 1006) {
        logger.warn(
          '[WebSocket] ⚠️ Abnormal closure (code 1006) - connection was interrupted or closed unexpectedly'
        );
        logger.warn(
          '[WebSocket] This usually means the connection was closed without a proper WebSocket close handshake'
        );
      }

      // Согласно документации API, сервер закрывает соединение после отправки данных
      // Если соединение закрылось и мы еще не завершили, нужно дождаться обработки всех сообщений
      if (!settled) {
        // Если были сообщения (особенно Blob), ждем их обработки
        if (pendingBlobPromises.length > 0) {
          const delay = 500; // Небольшая задержка для обработки Blob
          logger.debug(
            `[WebSocket] Waiting ${delay}ms for ${pendingBlobPromises.length} pending Blob operations`
          );

          Promise.all(pendingBlobPromises).finally(() => {
            setTimeout(() => {
              if (!settled) {
                logger.debug(
                  `[WebSocket] Resolving after Blob processing, final rows: ${rows.length}`
                );
                settled = true;
                setConnectionStatus('disconnected');
                resolve(rows);
                // НЕ вызываем cleanup() - соединение уже закрыто сервером
              }
            }, 50);
          });

          // Fallback таймаут
          setTimeout(() => {
            if (!settled) {
              logger.debug(
                `[WebSocket] Resolving after fallback timeout, final rows: ${rows.length}`
              );
              settled = true;
              setConnectionStatus('disconnected');
              resolve(rows);
              // НЕ вызываем cleanup() - соединение уже закрыто сервером
            }
          }, delay + 200);
        } else {
          // Нет асинхронных операций
          logger.debug(
            `[WebSocket] No pending operations, connection closed with ${rows.length} rows`
          );
          logger.debug(
            `[WebSocket] Connection closed with code ${event.code}, had ${messageCount} messages`
          );

          // Если соединение закрылось без сообщений, ждем таймаута
          // Сервер может отправлять данные в течение минуты
          if (messageCount === 0 && rows.length === 0) {
            logger.info(
              `[WebSocket] Connection closed without data, but waiting up to ${WS_TIMEOUT}ms for server to send data...`
            );
            logger.debug(
              `[WebSocket] Server may send data later, will wait for timeout or data`
            );
            // НЕ вызываем finish() здесь - дождемся таймаута или данных
            // Таймаут уже установлен и завершит promise если данных не будет
            setConnectionStatus('connecting'); // Оставляем статус "connecting" пока ждем
          } else if (!settled) {
            // Если получили данные и promise еще не разрешен, разрешаем его
            logger.info(
              `[WebSocket] Connection closed with ${rows.length} rows, resolving promise`
            );
            settled = true;
            setConnectionStatus('disconnected');
            resolve(rows);
            // НЕ вызываем cleanup() - соединение уже закрыто сервером
          } else {
            logger.debug(
              `[WebSocket] Connection closed but promise already resolved`
            );
          }
        }
      } else {
        logger.debug(
          '[WebSocket] Connection closed, but already settled (probably finished earlier)'
        );
      }
    };
  });
}

/**
 * Публичная функция для получения данных с дедупликацией и кэшированием
 */
async function fetchStraightSpreads(
  params: WebSocketParams & {
    _reconnectAttempt?: number;
  }
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
        reverseSpread: null, // будет заполняться из reverse‑эндпоинта позже
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
