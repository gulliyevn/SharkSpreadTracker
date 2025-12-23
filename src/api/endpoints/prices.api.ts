import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';
import {
  DexScreenerResponseSchema,
  MexcTickerSchema,
} from '../schemas';
import { CHAIN_IDS } from '@/constants/chains';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';
import { isCanceledError, getErrorStatusCode } from '@/utils/errors';
import { queuedRequest, RequestPriority } from '@/utils/request-queue';
import {
  requestDeduplicator,
  createDeduplicationKey,
} from '@/utils/request-deduplication';
import { validateTokenSymbol } from '@/utils/validation';

/**
 * Интерфейс для цены токена
 */
export interface TokenPrice {
  price: number | null;
  bid?: number | null;
  ask?: number | null;
  timestamp: number;
  source: 'jupiter' | 'pancakeswap' | 'mexc';
}

/**
 * Интерфейс для всех цен токена
 */
export interface AllPrices {
  symbol: string;
  chain: 'solana' | 'bsc';
  jupiter: TokenPrice | null;
  pancakeswap: TokenPrice | null;
  mexc: TokenPrice | null;
  timestamp: number;
}

/**
 * Получить цену токена из Jupiter
 * @param symbol - Символ токена (например, 'SOL')
 * @param address - Адрес токена в Solana (опционально)
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getJupiterPrice(
  symbol: string,
  address?: string,
  signal?: AbortSignal
): Promise<TokenPrice | null> {
  // Дедупликация запросов
  const dedupKey = createDeduplicationKey('jupiter-price', { symbol, address });
  
  return requestDeduplicator.deduplicate(dedupKey, () =>
    queuedRequest(
      async () => {
        // Проверка rate limiting
        if (!rateLimiter.isAllowed('jupiter-api')) {
          logger.warn('Jupiter API rate limit exceeded');
          return null;
        }

      try {
        // Jupiter API V3 для получения цены
        // Эндпоинт: /price/v3?ids={address}
        // Требует address (mint address токена)
        if (!address) {
          logger.debug(`Jupiter price: address required for ${symbol}, returning null`);
          return null;
        }

        // Используем Price API V3
        const endpoint = `/price/v3?ids=${address}`;
        const response = await jupiterClient.get(endpoint, { signal });

        // Price API V3 возвращает объект с ключами-адресами и значениями-ценами
        if (!response.data || typeof response.data !== 'object') {
          logger.debug(`Jupiter price: invalid response for ${symbol}`);
          return null;
        }

        const priceData = response.data as Record<string, { usdPrice?: number } | null>;
        const tokenPrice = priceData[address];

        if (!tokenPrice || !tokenPrice.usdPrice || tokenPrice.usdPrice <= 0) {
          logger.debug(`Jupiter price: no valid price for ${symbol}`);
          return null;
        }

        return {
          price: tokenPrice.usdPrice,
          timestamp: Date.now(),
          source: 'jupiter',
        };
      } catch (error) {
        // Игнорируем CanceledError
        if (isCanceledError(error)) {
          logger.debug('Jupiter price request was canceled');
          return null;
        }
        logger.error('Error fetching Jupiter price:', error);
        return null;
      }
    },
    {
      priority: RequestPriority.NORMAL,
      maxRetries: 2,
      rateLimitKey: 'jupiter-api',
    })
  );
}

/**
 * Получить цену токена из PancakeSwap/DexScreener
 * @param symbol - Символ токена (например, 'CAKE')
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getPancakePrice(
  symbol: string,
  signal?: AbortSignal
): Promise<TokenPrice | null> {
  // Валидация символа перед запросом
  if (!validateTokenSymbol(symbol)) {
    logger.debug(`PancakeSwap price: invalid symbol "${symbol}", skipping request`);
    return null;
  }
  
  // Дедупликация запросов
  const dedupKey = createDeduplicationKey('pancake-price', { symbol });
  
  return requestDeduplicator.deduplicate(dedupKey, () =>
    queuedRequest(
      async () => {
        // Проверка rate limiting
        if (!rateLimiter.isAllowed('pancakeswap-api')) {
          logger.warn('PancakeSwap API rate limit exceeded');
          return null;
        }

      try {
        // DexScreener API для получения цены
        // Эндпоинт: /latest/dex/tokens/{address} или поиск по символу
        // Для BSC используем поиск по символу
        // Важно: кодируем символ для безопасной передачи в URL
        const encodedSymbol = encodeURIComponent(symbol);
        const response = await pancakeClient.get(`/latest/dex/search?q=${encodedSymbol}`, {
          signal,
        });

        // Валидация через Zod
        const validated = DexScreenerResponseSchema.safeParse(response.data);

        if (!validated.success) {
          logger.warn('PancakeSwap price validation failed:', validated.error);
          return null;
        }

        const data = validated.data;
        const pairs = data.pairs || [];

        // Ищем пару с нужным символом на BSC
        const pair = pairs.find(
          (p) =>
            p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase() &&
            CHAIN_IDS.BSC.includes(p.chainId as (typeof CHAIN_IDS.BSC)[number])
        );

        if (!pair || !pair.priceUsd) {
          return null;
        }

        const price = parseFloat(pair.priceUsd);
        if (isNaN(price) || price <= 0) {
          return null;
        }

        return {
          price,
          timestamp: Date.now(),
          source: 'pancakeswap',
        };
      } catch (error) {
        // Игнорируем CanceledError
        if (isCanceledError(error)) {
          logger.debug('PancakeSwap price request was canceled');
          return null;
        }
        logger.error('Error fetching PancakeSwap price:', error);
        return null;
      }
    },
    {
      priority: RequestPriority.NORMAL,
      maxRetries: 2,
      rateLimitKey: 'pancakeswap-api',
    })
  );
}

/**
 * Получить цену токена из MEXC
 * @param symbol - Символ токена (например, 'BTCUSDT')
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getMexcPrice(
  symbol: string,
  signal?: AbortSignal
): Promise<TokenPrice | null> {
  // Валидация символа перед запросом
  // Для MEXC символ может быть в формате "BTCUSDT", но не "420USDT"
  if (!validateTokenSymbol(symbol)) {
    logger.debug(`MEXC price: invalid symbol "${symbol}", skipping request`);
    return null;
  }
  
  // Дедупликация запросов
  const dedupKey = createDeduplicationKey('mexc-price', { symbol });
  
  return requestDeduplicator.deduplicate(dedupKey, () =>
    queuedRequest(
      async () => {
        // Проверка rate limiting
        if (!rateLimiter.isAllowed('mexc-api')) {
          logger.warn('MEXC API rate limit exceeded');
          return null;
        }

      try {
        // MEXC API для получения тикера
        // Эндпоинт: /api/v3/ticker/price или /api/v3/ticker/bookTicker
        // В dev-режиме baseURL уже содержит /api/mexc, поэтому используем /v3/ticker/bookTicker
        // Важно: /v3/ticker/bookTicker может возвращать массив или объект
        const endpoint = import.meta.env.DEV
          ? `/v3/ticker/bookTicker?symbol=${symbol}`
          : `/api/v3/ticker/bookTicker?symbol=${symbol}`;
        const response = await mexcClient.get(endpoint, { signal });

        // Обрабатываем случай, когда API возвращает массив вместо объекта
        let tickerData = response.data;
        if (Array.isArray(tickerData)) {
          // Если массив, берем первый элемент
          tickerData = tickerData.length > 0 ? tickerData[0] : null;
          if (!tickerData) {
            logger.debug(`MEXC: bookTicker returned empty array for ${symbol}`);
            // Пробуем fallback
          } else {
            logger.debug(`MEXC: bookTicker returned array, using first element for ${symbol}`);
          }
        }

        // Валидация через Zod
        const validated = tickerData ? MexcTickerSchema.safeParse(tickerData) : { success: false, error: null };

        if (!validated.success) {
          // Если bookTicker не работает, пробуем обычный ticker
          try {
            const fallbackEndpoint = import.meta.env.DEV
              ? `/v3/ticker/price?symbol=${symbol}`
              : `/api/v3/ticker/price?symbol=${symbol}`;
            const tickerResponse = await mexcClient.get(fallbackEndpoint, {
              signal,
            });
            const priceStr = tickerResponse.data?.price;
            if (priceStr) {
              const price = parseFloat(priceStr);
              if (!isNaN(price) && price > 0) {
                return {
                  price,
                  timestamp: Date.now(),
                  source: 'mexc',
                };
              }
            }
          } catch (tickerError) {
            // Игнорируем CanceledError
            if (isCanceledError(tickerError)) {
              logger.debug('MEXC ticker price request was canceled');
              return null;
            }
            
            // 400 Bad Request означает, что токена нет на MEXC - это нормально
            const tickerStatusCode = getErrorStatusCode(tickerError);
            if (tickerStatusCode === 400) {
              if (import.meta.env.DEV) {
                logger.debug(`MEXC: token ${symbol} not found on exchange (400 Bad Request) - fallback ticker`);
              }
              return null;
            }
            
            // Для других ошибок логируем как предупреждение
            logger.warn('Error fetching MEXC ticker price:', tickerError);
          }

          logger.warn('MEXC price validation failed:', validated.error);
          return null;
        }

        if (!validated.success || !('data' in validated)) {
          return null;
        }

        const ticker = validated.data;
        const price = parseFloat(ticker.price);
        const bidPrice = ticker.bidPrice ? parseFloat(ticker.bidPrice) : null;
        const askPrice = ticker.askPrice ? parseFloat(ticker.askPrice) : null;

        if (isNaN(price) || price <= 0) {
          return null;
        }

        return {
          price,
          bid: bidPrice && !isNaN(bidPrice) && bidPrice > 0 ? bidPrice : null,
          ask: askPrice && !isNaN(askPrice) && askPrice > 0 ? askPrice : null,
          timestamp: Date.now(),
          source: 'mexc',
        };
      } catch (error) {
        // Игнорируем CanceledError
        if (isCanceledError(error)) {
          logger.debug('MEXC price request was canceled');
          return null;
        }
        
        // 400 Bad Request означает, что токена нет на MEXC - это нормально, не ошибка
        const statusCode = getErrorStatusCode(error);
        if (statusCode === 400) {
          // Токена нет на MEXC - это нормальная ситуация, не логируем как ошибку
          if (import.meta.env.DEV) {
            logger.debug(`MEXC: token ${symbol} not found on exchange (400 Bad Request)`);
          }
          return null;
        }
        
        // Для других ошибок логируем как предупреждение или ошибку
        if (statusCode && statusCode >= 500) {
          logger.error(`MEXC price request failed with status ${statusCode}:`, error);
        } else {
          logger.warn(`MEXC price request failed for ${symbol}:`, error);
        }
        return null;
      }
    },
    {
      priority: RequestPriority.NORMAL,
      maxRetries: 2,
      rateLimitKey: 'mexc-api',
    })
  );
}

/**
 * Получить все цены для токена из всех источников
 * @param token - Токен (symbol и chain)
 * @param signal - AbortSignal для отмены запросов (опционально)
 */
export async function getAllPrices(
  token: Token,
  signal?: AbortSignal
): Promise<AllPrices> {
  // Валидация символа токена перед запросами
  if (!validateTokenSymbol(token.symbol)) {
    logger.warn(`getAllPrices: invalid symbol "${token.symbol}" (chain: ${token.chain}), skipping API requests`);
    return {
      symbol: token.symbol,
      chain: token.chain,
      jupiter: null,
      pancakeswap: null,
      mexc: null,
      timestamp: Date.now(),
    };
  }
  
  // Дедупликация запросов для getAllPrices
  const dedupKey = createDeduplicationKey('all-prices', {
    symbol: token.symbol,
    chain: token.chain,
  });
  
  return requestDeduplicator.deduplicate(dedupKey, async () => {
  const { symbol, chain } = token;
  const timestamp = Date.now();

  // Выполняем запросы параллельно
  const results = await Promise.allSettled([
    // Jupiter только для Solana
    chain === 'solana'
      ? getJupiterPrice(symbol, undefined, signal)
      : Promise.resolve(null),
    // PancakeSwap только для BSC
    chain === 'bsc' ? getPancakePrice(symbol, signal) : Promise.resolve(null),
    // MEXC для обоих блокчейнов (нужно правильно сформировать символ)
    // Формируем символ для MEXC: {SYMBOL}USDT
    // Убираем специальные символы ($, @ и т.д.) из начала символа
    // Валидация символа происходит внутри getMexcPrice
    (() => {
      // Убираем ВСЕ специальные символы (например, $HNTT -> HNTT, BUBBA$ -> BUBBA)
      const cleanSymbol = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!cleanSymbol || cleanSymbol.length < 2) {
        logger.debug(`getAllPrices: cannot create MEXC symbol from "${symbol}" (cleaned: "${cleanSymbol}"), skipping`);
        return Promise.resolve(null);
      }
      const mexcSymbol = `${cleanSymbol}USDT`;
      // Предварительная валидация перед запросом
      if (!validateTokenSymbol(mexcSymbol)) {
        logger.debug(`getAllPrices: invalid MEXC symbol "${mexcSymbol}" for token "${symbol}", skipping`);
        return Promise.resolve(null);
      }
      return getMexcPrice(mexcSymbol, signal);
    })(),
  ]);

  const jupiterPrice =
    results[0].status === 'fulfilled' ? results[0].value : null;
  const pancakePrice =
    results[1].status === 'fulfilled' ? results[1].value : null;
  const mexcPrice = results[2].status === 'fulfilled' ? results[2].value : null;

  // Логируем для диагностики (только для первых нескольких запросов)
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logCount = ((globalThis as any).__getAllPricesLogCount as number) || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__getAllPricesLogCount = logCount + 1;
    
    if (logCount < 5) {
      logger.debug(`[getAllPrices] Prices for ${symbol} (${chain}):`, {
        jupiter: jupiterPrice ? { price: jupiterPrice.price, bid: jupiterPrice.bid, ask: jupiterPrice.ask } : null,
        pancakeswap: pancakePrice ? { price: pancakePrice.price, bid: pancakePrice.bid, ask: pancakePrice.ask } : null,
        mexc: mexcPrice ? { price: mexcPrice.price, bid: mexcPrice.bid, ask: mexcPrice.ask } : null,
        jupiterStatus: results[0].status,
        pancakeStatus: results[1].status,
        mexcStatus: results[2].status,
      });
    }
  }

    return {
      symbol,
      chain,
      jupiter: jupiterPrice,
      pancakeswap: pancakePrice,
      mexc: mexcPrice,
      timestamp,
    };
  });
}
