import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';
import {
  JupiterPricesResponseSchema,
  DexScreenerResponseSchema,
  MexcTickerSchema,
} from '../schemas';
import { CHAIN_IDS } from '@/constants/chains';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';

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
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('jupiter-api')) {
    logger.warn('Jupiter API rate limit exceeded');
    return null;
  }

  try {
    // Jupiter API для получения цены
    // Эндпоинт: /price/v1/quote или /v1/quote
    const endpoint = address
      ? `/price/v1/quote?ids=${address}`
      : `/price/v1/quote?ids=${symbol}`;

    const response = await jupiterClient.get(endpoint, { signal });

    // Валидация через Zod
    const validated = JupiterPricesResponseSchema.safeParse(response.data);

    if (!validated.success) {
      logger.warn('Jupiter price validation failed:', validated.error);
      return null;
    }

    const prices = validated.data;
    const priceEntry = Object.values(prices)[0];

    if (!priceEntry || priceEntry.price === null) {
      return null;
    }

    return {
      price: priceEntry.price,
      timestamp: Date.now(),
      source: 'jupiter',
    };
  } catch (error) {
    logger.error('Error fetching Jupiter price:', error);
    return null;
  }
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
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('pancakeswap-api')) {
    logger.warn('PancakeSwap API rate limit exceeded');
    return null;
  }

  try {
    // DexScreener API для получения цены
    // Эндпоинт: /latest/dex/tokens/{address} или поиск по символу
    // Для BSC используем поиск по символу
    const response = await pancakeClient.get(`/latest/dex/search?q=${symbol}`, {
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
    logger.error('Error fetching PancakeSwap price:', error);
    return null;
  }
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
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('mexc-api')) {
    logger.warn('MEXC API rate limit exceeded');
    return null;
  }

  try {
    // MEXC API для получения тикера
    // Эндпоинт: /api/v3/ticker/price или /api/v3/ticker/bookTicker
    // В dev-режиме baseURL уже содержит /api/mexc, поэтому используем /v3/ticker/bookTicker
    const endpoint = import.meta.env.DEV
      ? `/v3/ticker/bookTicker?symbol=${symbol}`
      : `/api/v3/ticker/bookTicker?symbol=${symbol}`;
    const response = await mexcClient.get(endpoint, { signal });

    // Валидация через Zod
    const validated = MexcTickerSchema.safeParse(response.data);

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
        logger.error('Error fetching MEXC ticker price:', tickerError);
      }

      logger.warn('MEXC price validation failed:', validated.error);
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
    logger.error('Error fetching MEXC price:', error);
    return null;
  }
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
    getMexcPrice(`${symbol.toUpperCase()}USDT`, signal),
  ]);

  const jupiterPrice =
    results[0].status === 'fulfilled' ? results[0].value : null;
  const pancakePrice =
    results[1].status === 'fulfilled' ? results[1].value : null;
  const mexcPrice = results[2].status === 'fulfilled' ? results[2].value : null;

  return {
    symbol,
    chain,
    jupiter: jupiterPrice,
    pancakeswap: pancakePrice,
    mexc: mexcPrice,
    timestamp,
  };
}
