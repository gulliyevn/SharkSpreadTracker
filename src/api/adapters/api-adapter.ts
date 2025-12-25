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
import { requestDeduplicator, createDeduplicationKey } from '@/utils/request-deduplication';

// Состояние соединения для экспорта
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
let currentConnectionStatus: ConnectionStatus = 'disconnected';
const connectionStatusListeners: Set<(status: ConnectionStatus) => void> = new Set();

export function getConnectionStatus(): ConnectionStatus {
  return currentConnectionStatus;
}

export function subscribeToConnectionStatus(listener: (status: ConnectionStatus) => void): () => void {
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

// Таймаут для batch обработки (legacy)
let batchTimeout: ReturnType<typeof setTimeout> | null = null;
const WS_TIMEOUT = 90000; // 1.5 минуты таймаут
const MAX_RECONNECT_ATTEMPTS = 3; // Максимум попыток реконнекта

// Кэш для всех токенов (используется для оптимизации)
let cachedAllTokens: StraightData[] | null = null;
let cachedAllTokensTimestamp: number = 0;
const CACHE_TTL = 5000; // 5 секунд - время жизни кэша

/**
 * Внутренняя функция для выполнения WebSocket запроса
 */
async function _fetchStraightSpreadsInternal(params: {
  token?: string;
  network?: string;
  signal?: AbortSignal;
  _reconnectAttempt?: number;
}): Promise<StraightData[]> {
  const reconnectAttempt = params._reconnectAttempt ?? 0;

  if (!WEBSOCKET_URL) {
    logger.warn('[WebSocket] WEBSOCKET_URL not configured, using mock data');
    setConnectionStatus('error');
    return [];
  }

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    logger.warn('[WebSocket] WebSocket not available');
    setConnectionStatus('error');
    return [];
  }

  // Логируем URL для отладки
  logger.info(`[WebSocket] Connecting to: ${WEBSOCKET_URL}`);
  setConnectionStatus('connecting');

  const url = new URL(WEBSOCKET_URL, window.location.href);
  if (params.token) {
    url.searchParams.set('token', params.token);
  }
  if (params.network) {
    url.searchParams.set('network', params.network);
  }

  return new Promise<StraightData[]>((resolve) => {
    let settled = false;
    const rows: StraightData[] = [];
    let messageCount = 0;
    let dataReceivedTimeout: ReturnType<typeof setTimeout> | null = null;

    logger.debug(`[WebSocket] Opening connection to: ${url.toString()}`);
    const ws = new WebSocket(url.toString());

    // Таймаут 1.5 минуты
    const timeoutId = setTimeout(async () => {
      if (settled) return;
      settled = true;
      logger.warn(`[WebSocket] Timeout after ${WS_TIMEOUT}ms, received ${messageCount} messages, ${rows.length} rows`);
      setConnectionStatus('disconnected');
      try {
        ws.close();
      } catch {
        /* ignore */
      }

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

    const finish = (result: StraightData[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (dataReceivedTimeout) {
        clearTimeout(dataReceivedTimeout);
        dataReceivedTimeout = null;
      }
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      
      logger.info(`[WebSocket] Finished with ${result.length} rows from ${messageCount} messages`);
      
      if (result.length > 0) {
        setConnectionStatus('connected');
      }
      
      resolve(result);
    };

    // Обработка буфера (legacy, теперь парсим сразу в onmessage)
    const processBatch = () => {
      // Теперь не используется - парсинг происходит в onmessage
    };

    if (params.signal) {
      if (params.signal.aborted) {
        finish([]);
        return;
      }
      params.signal.addEventListener('abort', () => finish([]), { once: true });
    }

    const processMessage = (rawData: string) => {
      logger.info(`[WebSocket] 📩 MESSAGE received (${rawData.length} chars)`);
      
      
      // Парсим сразу, без буферизации (данные приходят одним большим сообщением)
      try {
        const parsed = JSON.parse(rawData);
        
        const list = Array.isArray(parsed) ? parsed : [parsed];
        
        logger.info(`[WebSocket] Parsed ${list.length} items from message`);
        
        // Логируем первый элемент для отладки
        if (list.length > 0 && messageCount === 0) {
          logger.debug('[WebSocket] First item sample:', JSON.stringify(list[0]));
        }
        
        let itemsAdded = 0;
        let itemsSkipped = 0;
        for (const item of list) {
          // Принимаем данные без изменений
          if (item && typeof item === 'object' && 'token' in item) {
            rows.push(item as StraightData);
            itemsAdded++;
          } else {
            itemsSkipped++;
          }
        }
        
        if (itemsSkipped > 0) {
          logger.debug(`[WebSocket] Skipped ${itemsSkipped} invalid items`);
        }
        
        messageCount++;
        logger.info(`[WebSocket] Total rows so far: ${rows.length} (added ${itemsAdded} from this message)`);
        
        // Если получили данные, ждем 2 секунды на дополнительные сообщения, затем завершаем
        // Это позволяет получить все данные, если они приходят несколькими сообщениями
        if (dataReceivedTimeout) {
          clearTimeout(dataReceivedTimeout);
        }
        dataReceivedTimeout = setTimeout(() => {
          if (!settled && rows.length > 0) {
            logger.info(`[WebSocket] Received ${rows.length} rows, finishing after 2s delay`);
            finish(rows);
          }
        }, 2000); // 2 секунды задержка после последнего сообщения
        
      } catch (err) {
        logger.error('[WebSocket] JSON parse error:', err);
        logger.debug('[WebSocket] Raw data start:', rawData.slice(0, 200));
        logger.debug('[WebSocket] Raw data end:', rawData.slice(-200));
      }
    };

    ws.onopen = () => {
      logger.info('[WebSocket] ✅ Connected successfully!');
      logger.debug('[WebSocket] readyState:', ws.readyState, '(1 = OPEN)');
      setConnectionStatus('connected');
      
      // Отправляем пустое сообщение для "активации" соединения
      // Некоторые бэкенды требуют этого для начала передачи данных
      try {
        ws.send('');
        logger.debug('[WebSocket] Sent empty message to activate connection');
      } catch (err) {
        logger.warn('[WebSocket] Failed to send activation message:', err);
      }
      
      logger.debug('[WebSocket] Waiting for messages from server...');
    };

    ws.onmessage = (event) => {
      
      let rawData: string;
      if (typeof event.data === 'string') {
        rawData = event.data;
      } else if (event.data instanceof Blob) {
        // Если данные приходят как Blob, конвертируем в текст
        event.data.text().then((text) => {
          rawData = text;
          processMessage(rawData);
        }).catch((err) => {
          logger.error('[WebSocket] Failed to convert Blob to text:', err);
        });
        return;
      } else {
        logger.error('[WebSocket] Unknown data type:', typeof event.data);
        return;
      }
      
      processMessage(rawData);
    };

    ws.onerror = async (error) => {
      logger.error('[WebSocket] ❌ Error:', error);
      setConnectionStatus('error');
      
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        ws.close();
      } catch {
        /* ignore */
      }

      // Автоматический реконнект при ошибке
      if (
        reconnectAttempt < MAX_RECONNECT_ATTEMPTS &&
        !params.signal?.aborted
      ) {
        logger.debug(
          `[WebSocket] Error, reconnecting (attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})...`
        );
        // Небольшая задержка перед реконнектом
        await new Promise((r) => setTimeout(r, 1000 * (reconnectAttempt + 1)));
        const result = await fetchStraightSpreads({
          ...params,
          _reconnectAttempt: reconnectAttempt + 1,
        });
        resolve(result);
      } else {
        logger.error('[WebSocket] Max reconnect attempts reached after errors');
        resolve([]);
      }
    };

    ws.onclose = (event) => {
      logger.info(`[WebSocket] 🔌 Closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`);
      logger.info(`[WebSocket] Stats: received ${messageCount} messages, parsed ${rows.length} rows`);
      
      // Коды закрытия:
      // 1000 = Normal closure
      // 1001 = Going away
      // 1005 = No status received (нормально для некоторых серверов)
      // 1006 = Abnormal closure (сервер упал или сеть)
      if (event.code === 1006) {
        logger.warn('[WebSocket] ⚠️ Abnormal closure - connection was interrupted');
      }
      
      // Обрабатываем оставшиеся сообщения в буфере
      processBatch();
      finish(rows);
    };
  });
}

/**
 * Публичная функция для получения данных с дедупликацией и кэшированием
 */
async function fetchStraightSpreads(params: {
  token?: string;
  network?: string;
  signal?: AbortSignal;
  _reconnectAttempt?: number;
}): Promise<StraightData[]> {
  // Если запрашиваются все токены без фильтров, проверяем кэш
  if (!params.token && !params.network) {
    const now = Date.now();
    if (cachedAllTokens && (now - cachedAllTokensTimestamp) < CACHE_TTL) {
      logger.debug(`[API] Using cached all tokens (${cachedAllTokens.length} items)`);
      return cachedAllTokens;
    }
  }

  // Создаем ключ для дедупликации
  const dedupeKey = createDeduplicationKey('fetchStraightSpreads', {
    token: params.token || '',
    network: params.network || '',
  });

  // Выполняем запрос с дедупликацией
  const result = await requestDeduplicator.deduplicate(
    dedupeKey,
    () => _fetchStraightSpreadsInternal(params)
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
    // Используем fetchStraightSpreads который уже имеет кэширование и дедупликацию
    const rows = await fetchStraightSpreads({ signal });
    
    // Если WebSocket вернул пустой результат - возвращаем пустой массив
    if (rows.length === 0) {
      logger.warn('[API] WebSocket returned empty result - no data available');
      return [];
    }
    
    // Возвращаем данные без изменений
    logger.info(`[API] Loaded ${rows.length} tokens from backend`);
    return rows;
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    const rows = await fetchStraightSpreads({
      token: token.symbol,
      network: token.chain,
      signal,
    });

    const priceCandidates: number[] = [];
    for (const row of rows) {
      const priceA = row.priceA ? Number(row.priceA) : null;
      const priceB = row.priceB ? Number(row.priceB) : null;
      if (priceA != null && Number.isFinite(priceA) && priceA > 0) priceCandidates.push(priceA);
      if (priceB != null && Number.isFinite(priceB) && priceB > 0) priceCandidates.push(priceB);
    }

    const price =
      priceCandidates.length > 0
        ? priceCandidates.reduce((sum, v) => sum + v, 0) /
          priceCandidates.length
        : null;

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
      network: token.chain,
      signal,
    });

    // Преобразуем network в chain для фильтрации
    const network = token.chain === 'bsc' ? 'bsc' : 'solana';
    const relevant = rows.filter(
      (r) => (r.token || '').toUpperCase().trim() === token.symbol.toUpperCase() && 
             (r.network || '').toLowerCase() === network
    );

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
            mexc_price: isMEXCB ? priceB : (isJupiterA ? null : priceB),
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
      const network = token.chain === 'bsc' ? 'bsc' : 'solana';
      const matches = rows.filter(
        (r) => (r.token || '').toUpperCase().trim() === token.symbol.toUpperCase() && 
               (r.network || '').toLowerCase() === network
      );

      if (!matches.length) continue;

      const priceCandidates: number[] = [];
      for (const row of matches) {
        const priceA = row.priceA ? Number(row.priceA) : null;
        const priceB = row.priceB ? Number(row.priceB) : null;
        if (priceA != null && Number.isFinite(priceA) && priceA > 0) priceCandidates.push(priceA);
        if (priceB != null && Number.isFinite(priceB) && priceB > 0) priceCandidates.push(priceB);
      }

      const price =
        priceCandidates.length > 0
          ? priceCandidates.reduce((sum, v) => sum + v, 0) /
            priceCandidates.length
          : null;

      const bestSpread = matches.reduce<number | null>((acc, row) => {
        const spread = row.spread ? Number(row.spread) : null;
        if (spread == null || !Number.isFinite(spread)) return acc;
        if (acc == null) return spread;
        return Math.max(acc, spread);
      }, null);

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
