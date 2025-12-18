import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';
import { isAxiosError, getErrorStatusCode, getErrorCode } from '@/utils/errors';
import { USE_MOCK_DATA, SOURCE_URLS } from '@/constants/api';
import { MOCK_TOKENS } from '../mockData/tokens.mock';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';

/**
 * Интерфейс для токена с дополнительными данными
 */
export interface TokenWithData extends Token {
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
}

/**
 * Типы для ответов API
 */
interface JupiterTokenResponse {
  address: string;
  symbol: string;
  name?: string;
  decimals?: number;
}

interface DexScreenerPair {
  baseToken?: {
    symbol: string;
    address?: string;
  };
  quoteToken?: {
    symbol: string;
    address?: string;
  };
}

interface DexScreenerResponse {
  pairs?: DexScreenerPair[];
}

/**
 * Получить все токены из Jupiter
 * Jupiter API: https://lite-api.jup.ag
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getJupiterTokens(signal?: AbortSignal): Promise<Token[]> {
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('jupiter-api')) {
    logger.warn('Jupiter API rate limit exceeded');
    return [];
  }

  try {
    // Jupiter API - получение списка токенов
    // Старый lite-api.jup.ag/tokens возвращает полные объекты с метаданными
    // Новый api.jup.ag/tokens/v2/mints/tradable возвращает только массив адресов (без метаданных)
    // Используем старый API для получения полных данных, пока он работает
    // Если есть API ключ, пробуем новый API, но он требует дополнительных запросов для метаданных
    const hasApiKey = !!import.meta.env.VITE_JUPITER_API_KEY;
    const isNewApi = SOURCE_URLS.JUPITER.includes('api.jup.ag');

    // Пока используем старый эндпоинт /tokens, который возвращает полные объекты
    // TODO: В будущем нужно будет использовать /tokens/v2/mints/tradable + запросы метаданных
    const endpoint = '/tokens';

    logger.debug(
      `Jupiter API: using endpoint ${endpoint}, hasApiKey: ${hasApiKey}, isNewApi: ${isNewApi}`
    );
    const response = await jupiterClient.get(endpoint, { signal });

    if (!response.data || !Array.isArray(response.data)) {
      logger.warn('Jupiter API: response is not an array', response.data);
      return [];
    }

    // Преобразуем данные Jupiter в наш формат
    const tokens = response.data as JupiterTokenResponse[];
    const result: Token[] = [];
    tokens.forEach((item) => {
      // Jupiter возвращает токены с полями: address, symbol, name, decimals, etc.
      if (item.symbol && item.address) {
        result.push({
          symbol: item.symbol.toUpperCase(),
          chain: 'solana' as const,
          address: item.address, // Сохраняем address для Jupiter токенов
        });
      }
    });

    logger.debug(
      `Jupiter API: parsed ${result.length} tokens from ${tokens.length} items`
    );
    return result;
  } catch (error: unknown) {
    // Если эндпоинт не найден, пробуем альтернативный
    if (isAxiosError(error) && getErrorStatusCode(error) === 404) {
      try {
        const response = await jupiterClient.get('/v1/tokens', { signal });
        if (response.data && Array.isArray(response.data)) {
          const tokens = response.data as JupiterTokenResponse[];
          const result: Token[] = [];
          tokens.forEach((item) => {
            if (item.symbol && item.address) {
              result.push({
                symbol: item.symbol.toUpperCase(),
                chain: 'solana' as const,
                address: item.address, // Сохраняем address для Jupiter токенов
              });
            }
          });
          return result;
        }
      } catch (fallbackError) {
        const fallbackStatusCode = getErrorStatusCode(fallbackError);
        logger.error(
          `Error fetching Jupiter tokens (fallback): ${fallbackStatusCode || 'unknown'}`,
          fallbackError
        );
      }
    }
    const jupiterStatusCode = getErrorStatusCode(error);
    const jupiterErrorCode = getErrorCode(error);
    logger.error(
      `Error fetching Jupiter tokens: ${jupiterStatusCode || jupiterErrorCode || 'unknown'}`,
      error
    );
    return [];
  }
}

/**
 * Получить все токены из PancakeSwap/DexScreener
 * DexScreener API: https://api.dexscreener.com/latest/dex/tokens
 * @param signal - AbortSignal для отмены запросов (опционально)
 */
export async function getPancakeTokens(signal?: AbortSignal): Promise<Token[]> {
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('pancakeswap-api')) {
    logger.warn('PancakeSwap API rate limit exceeded');
    return [];
  }

  try {
    // DexScreener API - получение популярных токенов BSC
    // Попробуем получить токены через поиск популярных пар
    const popularTokens = ['BNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTC'];
    // Используем Map для сохранения symbol -> address (избегаем дубликатов)
    const tokensMap = new Map<string, Token>();

    // Получаем данные для популярных токенов
    for (const tokenSymbol of popularTokens) {
      // Проверка rate limiting для каждого запроса
      if (!rateLimiter.isAllowed('pancakeswap-api')) {
        logger.warn(`PancakeSwap API rate limit exceeded for ${tokenSymbol}`);
        continue;
      }

      try {
        // DexScreener API использует /latest/dex/search?q={query} для поиска
        const searchPath =
          '/latest/dex/search?q=' + encodeURIComponent(tokenSymbol);
        const response = await pancakeClient.get<DexScreenerResponse>(
          searchPath,
          { signal }
        );
        if (response.data?.pairs && Array.isArray(response.data.pairs)) {
          response.data.pairs.forEach((pair) => {
            // Обрабатываем baseToken
            if (pair.baseToken?.symbol) {
              const symbol = pair.baseToken.symbol.toUpperCase();
              const address = pair.baseToken.address;
              // Сохраняем только если еще нет или если есть address (приоритет address)
              if (!tokensMap.has(symbol) || address) {
                tokensMap.set(symbol, {
                  symbol,
                  chain: 'bsc' as const,
                  address: address || tokensMap.get(symbol)?.address,
                });
              }
            }
            // Обрабатываем quoteToken
            if (pair.quoteToken?.symbol) {
              const symbol = pair.quoteToken.symbol.toUpperCase();
              const address = pair.quoteToken.address;
              // Сохраняем только если еще нет или если есть address (приоритет address)
              if (!tokensMap.has(symbol) || address) {
                tokensMap.set(symbol, {
                  symbol,
                  chain: 'bsc' as const,
                  address: address || tokensMap.get(symbol)?.address,
                });
              }
            }
          });
        }
      } catch (tokenError) {
        // Пропускаем ошибки для отдельных токенов
        continue;
      }
    }

    // Преобразуем в массив токенов
    return Array.from(tokensMap.values());
  } catch (error) {
    const pancakeStatusCode = getErrorStatusCode(error);
    const pancakeErrorCode = getErrorCode(error);
    logger.error(
      `Error fetching PancakeSwap tokens: ${pancakeStatusCode || pancakeErrorCode || 'unknown'}`,
      error
    );
    return [];
  }
}

/**
 * Получить все токены из MEXC
 * MEXC API: https://contract.mexc.com
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getMexcTokens(signal?: AbortSignal): Promise<Token[]> {
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('mexc-api')) {
    logger.warn('MEXC API rate limit exceeded');
    return [];
  }

  try {
    // MEXC API - получение информации о бирже
    // Для spot trading используем /api/v3/exchangeInfo
    // Contract API использует другой формат, попробуем сначала spot API
    const endpoint = import.meta.env.DEV
      ? '/v3/exchangeInfo'
      : '/api/v3/exchangeInfo';

    logger.debug(`MEXC API: using endpoint ${endpoint}`);
    const response = await mexcClient.get(endpoint, { signal });

    // Не используем строгую валидацию Zod, так как структура может отличаться
    // Просто проверяем что есть symbols массив
    if (!response.data || typeof response.data !== 'object') {
      return [];
    }

    const data = response.data as { symbols?: unknown[] };
    if (!data.symbols || !Array.isArray(data.symbols)) {
      return [];
    }

    // Преобразуем данные MEXC в наш формат
    const tokensMap = new Map<string, Token>();

    data.symbols.forEach((symbolItem) => {
      // Безопасная проверка структуры
      if (
        !symbolItem ||
        typeof symbolItem !== 'object' ||
        !('symbol' in symbolItem) ||
        !('status' in symbolItem)
      ) {
        return;
      }

      const symbol = symbolItem as {
        symbol: string;
        status: string;
        baseAsset?: string;
        quoteAsset?: string;
      };

      if (symbol.symbol && symbol.status === 'ENABLED') {
        // Определяем блокчейн по символу или другим полям
        // MEXC поддерживает оба блокчейна, но нужно определить какой
        const baseAsset = symbol.baseAsset || '';
        const quoteAsset = symbol.quoteAsset || '';

        // Если есть USDT или BUSD - скорее всего BSC
        // Если есть SOL - Solana
        let chain: 'solana' | 'bsc' = 'bsc';

        if (baseAsset.includes('SOL') || quoteAsset.includes('SOL')) {
          chain = 'solana';
        }

        const tokenSymbol =
          symbol.baseAsset?.toUpperCase() || symbol.symbol.toUpperCase();
        if (tokenSymbol) {
          tokensMap.set(`${tokenSymbol}-${chain}`, {
            symbol: tokenSymbol,
            chain,
          });
        }
      }
    });

    return Array.from(tokensMap.values());
  } catch (error: unknown) {
    // Если основной эндпоинт не работает, пробуем альтернативный
    const initialStatusCode = getErrorStatusCode(error);
    const initialErrorCode = getErrorCode(error);
    if (initialStatusCode === 404 || initialErrorCode === 'ECONNREFUSED') {
      try {
        // Альтернативный эндпоинт для MEXC (contract API)
        const fallbackEndpoint = import.meta.env.DEV
          ? '/v1/contract/exchangeInfo'
          : '/api/v1/contract/exchangeInfo';
        logger.debug(`MEXC API: trying fallback endpoint ${fallbackEndpoint}`);
        const response = await mexcClient.get(fallbackEndpoint, { signal });
        const data = response.data as { symbols?: unknown[] } | undefined;
        if (data?.symbols && Array.isArray(data.symbols)) {
          const tokensMap = new Map<string, Token>();
          data.symbols.forEach((symbolItem) => {
            if (
              !symbolItem ||
              typeof symbolItem !== 'object' ||
              !('symbol' in symbolItem) ||
              !('status' in symbolItem)
            ) {
              return;
            }
            const symbol = symbolItem as {
              symbol: string;
              status: string;
              baseAsset?: string;
            };
            if (symbol.symbol && symbol.status === 'ENABLED') {
              const tokenSymbol =
                symbol.baseAsset?.toUpperCase() || symbol.symbol.toUpperCase();
              if (tokenSymbol) {
                tokensMap.set(`${tokenSymbol}-bsc`, {
                  symbol: tokenSymbol,
                  chain: 'bsc' as const,
                });
              }
            }
          });
          return Array.from(tokensMap.values());
        }
      } catch (fallbackError) {
        const fallbackStatusCode = getErrorStatusCode(fallbackError);
        logger.error(
          `Error fetching MEXC tokens (fallback): ${fallbackStatusCode || 'unknown'}`,
          fallbackError
        );
      }
    }
    logger.error(
      `Error fetching MEXC tokens: ${initialStatusCode || initialErrorCode || 'unknown'}`,
      error
    );
    return [];
  }
}

/**
 * Получить все токены из всех источников и объединить
 * @param signal - AbortSignal для отмены запросов (опционально)
 */
export async function getAllTokens(
  signal?: AbortSignal
): Promise<TokenWithData[]> {
  // Если включен режим мок-данных, сразу возвращаем их без запросов к API
  if (USE_MOCK_DATA) {
    logger.debug('Using mock data (USE_MOCK_DATA=true), skipping API calls');
    return MOCK_TOKENS;
  }

  try {
    // Выполняем запросы параллельно с обработкой ошибок
    const results = await Promise.allSettled([
      getJupiterTokens(signal),
      getPancakeTokens(signal),
      getMexcTokens(signal),
    ]);

    const jupiterTokens: Token[] =
      results[0].status === 'fulfilled' ? results[0].value : [];
    const pancakeTokens: Token[] =
      results[1].status === 'fulfilled' ? results[1].value : [];
    const mexcTokens: Token[] =
      results[2].status === 'fulfilled' ? results[2].value : [];

    // Логируем результаты для отладки
    logger.debug('Token fetch results:', {
      jupiter: jupiterTokens.length,
      pancake: pancakeTokens.length,
      mexc: mexcTokens.length,
    });

    // Объединяем все токены, убираем дубликаты
    const allTokensMap = new Map<string, TokenWithData>();

    // Добавляем токены из Jupiter (Solana)
    jupiterTokens.forEach((token) => {
      const key = `${token.symbol}-${token.chain}`;
      if (!allTokensMap.has(key)) {
        allTokensMap.set(key, { ...token });
      }
    });

    // Добавляем токены из PancakeSwap (BSC)
    pancakeTokens.forEach((token) => {
      const key = `${token.symbol}-${token.chain}`;
      if (!allTokensMap.has(key)) {
        allTokensMap.set(key, { ...token });
      }
    });

    // Добавляем токены из MEXC (оба блокчейна)
    mexcTokens.forEach((token) => {
      const key = `${token.symbol}-${token.chain}`;
      if (!allTokensMap.has(key)) {
        allTokensMap.set(key, { ...token });
      }
    });

    // Сортируем по символу для удобства
    const result = Array.from(allTokensMap.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );

    // Если все API вернули пустые результаты, возвращаем пустой массив
    // Мок-данные используются только если явно включен USE_MOCK_DATA
    if (result.length === 0) {
      logger.warn(
        `All API endpoints returned empty results (Jupiter: ${jupiterTokens.length}, Pancake: ${pancakeTokens.length}, MEXC: ${mexcTokens.length}).`
      );
      return [];
    }

    return result;
  } catch (error) {
    const allTokensStatusCode = getErrorStatusCode(error);
    const allTokensErrorCode = getErrorCode(error);
    logger.error(
      `Error fetching all tokens: ${allTokensStatusCode || allTokensErrorCode || 'unknown'}`,
      error
    );
    // В случае ошибки возвращаем пустой массив
    // Мок-данные используются только если явно включен USE_MOCK_DATA
    logger.error('Error fetching all tokens, returning empty array');
    return [];
  }
}
