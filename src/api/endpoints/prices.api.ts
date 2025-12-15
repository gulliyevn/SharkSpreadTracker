import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';
import {
  JupiterPricesResponseSchema,
  DexScreenerResponseSchema,
  MexcTickerSchema,
} from '../schemas';

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
 */
export async function getJupiterPrice(
  symbol: string,
  address?: string
): Promise<TokenPrice | null> {
  try {
    // Jupiter API для получения цены
    // Эндпоинт: /price/v1/quote или /v1/quote
    const endpoint = address
      ? `/price/v1/quote?ids=${address}`
      : `/price/v1/quote?ids=${symbol}`;

    const response = await jupiterClient.get(endpoint);

    // Валидация через Zod
    const validated = JupiterPricesResponseSchema.safeParse(response.data);

    if (!validated.success) {
      console.warn('Jupiter price validation failed:', validated.error);
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
    console.error('Error fetching Jupiter price:', error);
    return null;
  }
}

/**
 * Получить цену токена из PancakeSwap/DexScreener
 * @param symbol - Символ токена (например, 'CAKE')
 */
export async function getPancakePrice(
  symbol: string
): Promise<TokenPrice | null> {
  try {
    // DexScreener API для получения цены
    // Эндпоинт: /latest/dex/tokens/{address} или поиск по символу
    // Для BSC используем поиск по символу
    const response = await pancakeClient.get(`/latest/dex/search?q=${symbol}`);

    // Валидация через Zod
    const validated = DexScreenerResponseSchema.safeParse(response.data);

    if (!validated.success) {
      console.warn('PancakeSwap price validation failed:', validated.error);
      return null;
    }

    const data = validated.data;
    const pairs = data.pairs || [];

    // Ищем пару с нужным символом на BSC
    const pair = pairs.find(
      (p) =>
        p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase() &&
        (p.chainId === 'bsc' || p.chainId === '56')
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
    console.error('Error fetching PancakeSwap price:', error);
    return null;
  }
}

/**
 * Получить цену токена из MEXC
 * @param symbol - Символ токена (например, 'BTCUSDT')
 */
export async function getMexcPrice(symbol: string): Promise<TokenPrice | null> {
  try {
    // MEXC API для получения тикера
    // Эндпоинт: /api/v3/ticker/price или /api/v3/ticker/bookTicker
    const response = await mexcClient.get(
      `/api/v3/ticker/bookTicker?symbol=${symbol}`
    );

    // Валидация через Zod
    const validated = MexcTickerSchema.safeParse(response.data);

    if (!validated.success) {
      // Если bookTicker не работает, пробуем обычный ticker
      try {
        const tickerResponse = await mexcClient.get(
          `/api/v3/ticker/price?symbol=${symbol}`
        );
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
        console.error('Error fetching MEXC ticker price:', tickerError);
      }

      console.warn('MEXC price validation failed:', validated.error);
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
    console.error('Error fetching MEXC price:', error);
    return null;
  }
}

/**
 * Получить все цены для токена из всех источников
 * @param token - Токен (symbol и chain)
 */
export async function getAllPrices(token: Token): Promise<AllPrices> {
  const { symbol, chain } = token;
  const timestamp = Date.now();

  // Выполняем запросы параллельно
  const results = await Promise.allSettled([
    // Jupiter только для Solana
    chain === 'solana' ? getJupiterPrice(symbol) : Promise.resolve(null),
    // PancakeSwap только для BSC
    chain === 'bsc' ? getPancakePrice(symbol) : Promise.resolve(null),
    // MEXC для обоих блокчейнов (нужно правильно сформировать символ)
    getMexcPrice(`${symbol}USDT`),
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
