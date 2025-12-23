/**
 * API Adapter - единая точка общения фронта с бэкендом
 */

import type {
  Token,
  SpreadResponse,
  TimeframeOption,
  MexcTradingLimits,
  StraightData,
  ReverseData,
  SpreadRow,
  TokenWithData,
  AllPrices,
} from '@/types';
import { WEBSOCKET_URL } from '@/constants/api';
import { logger } from '@/utils/logger';

/**
 * Интерфейс для API адаптера
 */
export interface IApiAdapter {
  // Tokens
  getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]>;

  // Prices
  getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices>;

  // Spreads
  getSpreadData(token: Token, timeframe?: TimeframeOption, signal?: AbortSignal): Promise<SpreadResponse>;
  getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens?: number): Promise<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>>;
  
  // MEXC Limits
  getMexcTradingLimits(symbol: string, signal?: AbortSignal): Promise<MexcTradingLimits | null>;
}

/**
 * Нормализация одной строки ответа spреда от бэкенда
 */
function normalizeSpreadRow(row: StraightData | ReverseData): SpreadRow | null {
  const symbol = (row.token || '').toUpperCase().trim();
  if (!symbol) return null;

  const network = (row.network || '').toLowerCase();
  let chain: 'solana' | 'bsc';
  if (network === 'bsc' || network === 'bep20') {
    chain = 'bsc';
  } else {
    // по умолчанию считаем solana, пока бэк не начнёт слать что-то иное
    chain = 'solana';
  }

  const rawPriceA = row.priceA ? Number(row.priceA) : NaN;
  const rawPriceB = row.priceB ? Number(row.priceB) : NaN;
  const rawSpread = row.spread ? Number(row.spread) : NaN;

  const priceA = Number.isFinite(rawPriceA) && rawPriceA > 0 ? rawPriceA : null;
  const priceB = Number.isFinite(rawPriceB) && rawPriceB > 0 ? rawPriceB : null;
  const spread = Number.isFinite(rawSpread) ? rawSpread : null;

  return {
    token: symbol,
    chain,
    aExchange: row.aExchange,
    bExchange: row.bExchange,
    priceA,
    priceB,
    spread,
    limit: row.limit,
  };
}

// Буфер для batch обработки сообщений WebSocket
let messageBuffer: string[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_DELAY = 50; // Обрабатываем сообщения пачками каждые 50мс
const WS_TIMEOUT = 90000; // 1.5 минуты таймаут
const MAX_RECONNECT_ATTEMPTS = 3; // Максимум попыток реконнекта

async function fetchStraightSpreads(params: {
  token?: string;
  network?: string;
  signal?: AbortSignal;
  _reconnectAttempt?: number;
}): Promise<SpreadRow[]> {
  const reconnectAttempt = params._reconnectAttempt ?? 0;

  if (!WEBSOCKET_URL) {
    return [];
  }

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    return [];
  }

  const url = new URL(WEBSOCKET_URL, window.location.href);
  if (params.token) {
    url.searchParams.set('token', params.token);
  }
  if (params.network) {
    url.searchParams.set('network', params.network);
  }

  return new Promise<SpreadRow[]>((resolve) => {
    let settled = false;
    const rows: SpreadRow[] = [];

    const ws = new WebSocket(url.toString());

    // Таймаут 1.5 минуты
    const timeoutId = window.setTimeout(async () => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ignore */ }
      
      // Автоматический реконнект при таймауте
      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS && !params.signal?.aborted) {
        logger.debug(`[WebSocket] Timeout, reconnecting (attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        const result = await fetchStraightSpreads({
          ...params,
          _reconnectAttempt: reconnectAttempt + 1,
        });
        resolve(result);
      } else {
        resolve([]);
      }
    }, WS_TIMEOUT);

    const finish = (result: SpreadRow[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      try { ws.close(); } catch { /* ignore */ }
      resolve(result);
    };

    // Обработка буфера сообщений пачкой
    const processBatch = () => {
      if (messageBuffer.length === 0) return;
      
      const batch = messageBuffer;
      messageBuffer = [];
      
      for (const raw of batch) {
        try {
          const data = JSON.parse(raw) as StraightData[] | StraightData;
          const list = Array.isArray(data) ? data : [data];
          for (const item of list) {
            const normalized = normalizeSpreadRow(item);
            if (normalized) {
              rows.push(normalized);
            }
          }
        } catch {
          // Игнорируем ошибки парсинга в production
        }
      }
    };

    if (params.signal) {
      if (params.signal.aborted) {
        finish([]);
        return;
      }
      params.signal.addEventListener('abort', () => finish([]), { once: true });
    }

    ws.onopen = () => {
      logger.debug('[WebSocket] Connected');
    };

    ws.onmessage = (event) => {
      // Буферизуем сообщения для batch обработки
      messageBuffer.push(event.data as string);
      
      // Откладываем обработку до следующего batch
      if (!batchTimeout) {
        batchTimeout = setTimeout(() => {
          batchTimeout = null;
          processBatch();
        }, BATCH_DELAY);
      }
    };

    ws.onerror = async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try { ws.close(); } catch { /* ignore */ }
      
      // Автоматический реконнект при ошибке
      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS && !params.signal?.aborted) {
        logger.debug(`[WebSocket] Error, reconnecting (attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        // Небольшая задержка перед реконнектом
        await new Promise(r => setTimeout(r, 1000 * (reconnectAttempt + 1)));
        const result = await fetchStraightSpreads({
          ...params,
          _reconnectAttempt: reconnectAttempt + 1,
        });
        resolve(result);
      } else {
        resolve([]);
      }
    };

    ws.onclose = () => {
      // Обрабатываем оставшиеся сообщения в буфере
      processBatch();
      finish(rows);
    };
  });
}

/**
 * Backend‑реализация адаптера.
 */
class BackendApiAdapter implements IApiAdapter {
  async getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]> {
    const rows = await fetchStraightSpreads({ signal });
    const map = new Map<string, TokenWithData>();

    for (const row of rows) {
      const key = `${row.token}-${row.chain}`;
      const prev = map.get(key);

      const base: TokenWithData =
        prev ??
        ({
          symbol: row.token,
          chain: row.chain,
          address: undefined,
          price: null,
          directSpread: null,
          reverseSpread: null,
        } as TokenWithData);

      const priceCandidates: number[] = [];
      if (row.priceA != null) priceCandidates.push(row.priceA);
      if (row.priceB != null) priceCandidates.push(row.priceB);
      const price =
        priceCandidates.length > 0
          ? priceCandidates.reduce((sum, v) => sum + v, 0) / priceCandidates.length
          : base.price ?? null;

      const directSpread = row.spread ?? base.directSpread ?? null;

      map.set(key, {
        ...base,
        price,
        directSpread,
        // обратный спред появится позже из отдельного эндпоинта
        reverseSpread: base.reverseSpread ?? null,
      });
    }

    const result = Array.from(map.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );

    return result;
  }

  async getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices> {
    const rows = await fetchStraightSpreads({
      token: token.symbol,
      network: token.chain,
      signal,
    });

    const priceCandidates: number[] = [];
    for (const row of rows) {
      if (row.priceA != null) priceCandidates.push(row.priceA);
      if (row.priceB != null) priceCandidates.push(row.priceB);
    }

    const price =
      priceCandidates.length > 0
        ? priceCandidates.reduce((sum, v) => sum + v, 0) / priceCandidates.length
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

    const relevant = rows.filter(
      (r) => r.token === token.symbol.toUpperCase() && r.chain === token.chain
    );

    const latest = relevant[0];
    const now = Date.now();

    const current =
      latest && (latest.priceA != null || latest.priceB != null)
        ? {
            timestamp: now,
            mexc_bid: null,
            mexc_ask: null,
            mexc_price: latest.priceB ?? null,
            jupiter_price: latest.priceA ?? null,
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
      const matches = rows.filter(
        (r) => r.token === token.symbol.toUpperCase() && r.chain === token.chain
      );

      if (!matches.length) continue;

      const priceCandidates: number[] = [];
      for (const row of matches) {
        if (row.priceA != null) priceCandidates.push(row.priceA);
        if (row.priceB != null) priceCandidates.push(row.priceB);
      }

      const price =
        priceCandidates.length > 0
          ? priceCandidates.reduce((sum, v) => sum + v, 0) / priceCandidates.length
          : null;

      const bestSpread = matches.reduce<number | null>((acc, row) => {
        if (row.spread == null) return acc;
        if (acc == null) return row.spread;
        return Math.max(acc, row.spread);
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

export const getSpreadData = async (token: Token, timeframe: TimeframeOption = '1h', signal?: AbortSignal) => {
  return apiAdapter.getSpreadData(token, timeframe, signal);
};

export const getSpreadsForTokens = async (tokens: Token[], signal?: AbortSignal, maxTokens?: number) => {
  return apiAdapter.getSpreadsForTokens(tokens, signal, maxTokens);
};

export const getMexcTradingLimits = async (symbol: string, signal?: AbortSignal) => {
  return apiAdapter.getMexcTradingLimits(symbol, signal);
};

// Экспортируем адаптер для обратной совместимости
export { apiAdapter };
