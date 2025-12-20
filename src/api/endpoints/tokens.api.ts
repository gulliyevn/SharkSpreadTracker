import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';
import { getErrorStatusCode, getErrorCode, isCanceledError } from '@/utils/errors';
import { USE_MOCK_DATA, SOURCE_URLS } from '@/constants/api';
import { MOCK_TOKENS } from '../mockData/tokens.mock';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';
import { queuedRequest, RequestPriority } from '@/utils/request-queue';
import { validateTokenSymbol } from '@/utils/validation';

// Определяем, используется ли прокси
const USE_PROXY = import.meta.env.VITE_USE_PROXY !== 'false';

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
 * Token API V2 возвращает структуру с полем 'id' (mint address)
 */
interface JupiterTokenResponse {
  id: string; // Mint address (в V2 это 'id', а не 'address')
  symbol: string;
  name?: string;
  decimals?: number;
  icon?: string;
  // Дополнительные поля V2 (опционально)
  circSupply?: number;
  totalSupply?: number;
  holderCount?: number;
}

interface DexScreenerPair {
  chainId?: string; // "bsc", "solana", etc.
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
  schemaVersion?: string;
  pairs?: DexScreenerPair[];
}

/**
 * Получить все токены из Jupiter
 * Jupiter API: https://lite-api.jup.ag или https://api.jup.ag
 * Примечание: Эндпоинты могут измениться, проверяйте актуальную документацию
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getJupiterTokens(signal?: AbortSignal): Promise<Token[]> {
  // Используем очередь запросов для управления rate limits
  return queuedRequest(
    async () => {
      // Проверка rate limiting
      if (!rateLimiter.isAllowed('jupiter-api')) {
        logger.warn('Jupiter API rate limit exceeded');
        return [];
      }

      try {
        // Jupiter API - получение списка токенов
        // Пробуем разные эндпоинты в порядке приоритета
        const apiKey = import.meta.env.VITE_JUPITER_API_KEY;
        const hasApiKey = !!apiKey && apiKey.trim().length > 0;
        const isNewApi = SOURCE_URLS.JUPITER.includes('api.jup.ag');
        
        // Логируем для диагностики
        if (import.meta.env.DEV) {
          logger.debug(
            `Jupiter API: hasApiKey=${hasApiKey}, apiKeyLength=${apiKey?.length || 0}, baseURL=${SOURCE_URLS.JUPITER}`
          );
        }

        // Список эндпоинтов для попытки (в порядке приоритета)
        // Правильный эндпоинт: /tokens/v2/recent (не просто /tokens/v2)
        // lite-api.jup.ag/tokens/v2/recent работает без API ключа (free tier)
        const endpoints = [
          '/tokens/v2/recent', // Token API V2 - список недавних токенов (работает без ключа)
          '/tokens/v2', // Fallback (может не работать)
        ];

        let lastError: unknown = null;

        // Пробуем каждый эндпоинт
        for (const endpoint of endpoints) {
          try {
            logger.debug(
              `Jupiter API: trying endpoint ${endpoint}, hasApiKey: ${hasApiKey}, isNewApi: ${isNewApi}, baseURL: ${SOURCE_URLS.JUPITER}`
            );
            const response = await jupiterClient.get(endpoint, { signal });
            
            // Логируем для диагностики
            logger.debug(
              `Jupiter API: response status ${response.status}, data type: ${Array.isArray(response.data) ? 'array' : typeof response.data}, length: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`
            );

            if (!response.data || !Array.isArray(response.data)) {
              logger.warn('Jupiter API: response is not an array', response.data);
              continue; // Пробуем следующий эндпоинт
            }

            // Преобразуем данные Jupiter в наш формат
            // Token API V2 /recent возвращает массив токенов с полем 'id' (mint address)
            const tokens = response.data as JupiterTokenResponse[];
            const result: Token[] = [];
            tokens.forEach((item) => {
              // Token API V2 возвращает токены с полем 'id' (mint address), а не 'address'
              // Также поддерживаем старый формат для обратной совместимости
              const mintAddress = item.id || (item as unknown as { address?: string }).address;
              const symbol = item.symbol?.toUpperCase();
              // Валидация символа перед добавлением
              if (symbol && mintAddress && validateTokenSymbol(symbol)) {
                result.push({
                  symbol,
                  chain: 'solana' as const,
                  address: mintAddress, // Сохраняем mint address для Jupiter токенов
                });
              }
            });

            logger.debug(
              `Jupiter API: parsed ${result.length} tokens from ${tokens.length} items using endpoint ${endpoint}`
            );
            return result;
          } catch (endpointError: unknown) {
            // Игнорируем CanceledError
            if (isCanceledError(endpointError)) {
              logger.debug('Jupiter API request was canceled');
              return [];
            }

            lastError = endpointError;
            const statusCode = getErrorStatusCode(endpointError);
            
            // Если 404, пробуем следующий эндпоинт
            if (statusCode === 404) {
              logger.debug(`Jupiter API: endpoint ${endpoint} returned 404, trying next`);
              continue;
            }

            // Для других ошибок пробуем следующий эндпоинт
            logger.warn(
              `Jupiter API: error on endpoint ${endpoint}: ${statusCode || 'unknown'}`
            );
          }
        }

        // Если все эндпоинты не сработали, логируем последнюю ошибку
        if (lastError) {
          const jupiterStatusCode = getErrorStatusCode(lastError);
          const jupiterErrorCode = getErrorCode(lastError);
          logger.error(
            `Error fetching Jupiter tokens (all endpoints failed): ${jupiterStatusCode || jupiterErrorCode || 'unknown'}`,
            lastError
          );
        }

        return [];
      } catch (error: unknown) {
        // Игнорируем CanceledError
        if (isCanceledError(error)) {
          logger.debug('Jupiter API request was canceled');
          return [];
        }

        const jupiterStatusCode = getErrorStatusCode(error);
        const jupiterErrorCode = getErrorCode(error);
        logger.error(
          `Error fetching Jupiter tokens: ${jupiterStatusCode || jupiterErrorCode || 'unknown'}`,
          error
        );
        return [];
      }
    },
    {
      priority: RequestPriority.HIGH,
      maxRetries: 2,
      rateLimitKey: 'jupiter-api',
    }
  );
}

/**
 * Получить все токены из PancakeSwap/DexScreener
 * DexScreener API: https://api.dexscreener.com/latest/dex/tokens
 * @param signal - AbortSignal для отмены запросов (опционально)
 */
export async function getPancakeTokens(signal?: AbortSignal): Promise<Token[]> {
  return queuedRequest(
    async () => {
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

        // Получаем данные для популярных токенов через очередь
        const tokenPromises = popularTokens
          .filter((tokenSymbol) => validateTokenSymbol(tokenSymbol)) // Фильтруем некорректные символы
          .map((tokenSymbol) =>
            queuedRequest(
              async () => {
                // Проверка rate limiting для каждого запроса
                if (!rateLimiter.isAllowed('pancakeswap-api')) {
                  logger.warn(`PancakeSwap API rate limit exceeded for ${tokenSymbol}`);
                  return null;
                }

              try {
                // DexScreener API использует /latest/dex/search?q={query} для поиска
                const searchPath =
                  '/latest/dex/search?q=' + encodeURIComponent(tokenSymbol);
                const response = await pancakeClient.get<DexScreenerResponse>(
                  searchPath,
                  { signal }
                );
                return response.data;
              } catch (tokenError) {
                // Игнорируем CanceledError
                if (isCanceledError(tokenError)) {
                  logger.debug(`PancakeSwap token search for ${tokenSymbol} was canceled`);
                  return null;
                }
                // Пропускаем ошибки для отдельных токенов
                return null;
              }
            },
            {
              priority: RequestPriority.NORMAL,
              maxRetries: 1,
              rateLimitKey: 'pancakeswap-api',
            }
          )
        );

        const results = await Promise.allSettled(tokenPromises);

        // Обрабатываем результаты
        // DexScreener возвращает: { schemaVersion: "1.0.0", pairs: [...] }
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const data = result.value as DexScreenerResponse;
            if (data.pairs && Array.isArray(data.pairs)) {
              data.pairs.forEach((pair) => {
                // Фильтруем только пары на BSC (chainId === "bsc")
                if (pair.chainId !== 'bsc') {
                  return;
                }

                // Обрабатываем baseToken
                if (pair.baseToken?.symbol) {
                  const symbol = pair.baseToken.symbol.toUpperCase();
                  const address = pair.baseToken.address;
                  // Валидация символа перед добавлением
                  if (validateTokenSymbol(symbol)) {
                    // Сохраняем только если еще нет или если есть address (приоритет address)
                    if (!tokensMap.has(symbol) || address) {
                      tokensMap.set(symbol, {
                        symbol,
                        chain: 'bsc' as const,
                        address: address || tokensMap.get(symbol)?.address,
                      });
                    }
                  }
                }
                // Обрабатываем quoteToken
                if (pair.quoteToken?.symbol) {
                  const symbol = pair.quoteToken.symbol.toUpperCase();
                  const address = pair.quoteToken.address;
                  // Валидация символа перед добавлением
                  if (validateTokenSymbol(symbol)) {
                    // Сохраняем только если еще нет или если есть address (приоритет address)
                    if (!tokensMap.has(symbol) || address) {
                      tokensMap.set(symbol, {
                        symbol,
                        chain: 'bsc' as const,
                        address: address || tokensMap.get(symbol)?.address,
                      });
                    }
                  }
                }
              });
            }
          }
        });

        // Преобразуем в массив токенов
        const result = Array.from(tokensMap.values());
        logger.debug(`PancakeSwap API: successfully parsed ${result.length} unique tokens`);
        return result;
      } catch (error) {
      // Игнорируем CanceledError
      if (isCanceledError(error)) {
        logger.debug('PancakeSwap tokens request was canceled');
        return [];
      }
      const pancakeStatusCode = getErrorStatusCode(error);
      const pancakeErrorCode = getErrorCode(error);
      logger.error(
        `Error fetching PancakeSwap tokens: ${pancakeStatusCode || pancakeErrorCode || 'unknown'}`,
        error
      );
      return [];
    }
  },
  {
    priority: RequestPriority.NORMAL,
    maxRetries: 2,
    rateLimitKey: 'pancakeswap-api',
  }
);
}

/**
 * Получить все токены из MEXC
 * MEXC API: https://contract.mexc.com
 * @param signal - AbortSignal для отмены запроса (опционально)
 */
export async function getMexcTokens(signal?: AbortSignal): Promise<Token[]> {
  return queuedRequest(
    async () => {
      // Проверка rate limiting
      if (!rateLimiter.isAllowed('mexc-api')) {
        logger.warn('MEXC API rate limit exceeded');
        return [];
      }

      try {
        // MEXC API - получение информации о бирже
        // Правильный эндпоинт: /api/v3/exchangeInfo
        // В dev-режиме с прокси: baseURL = /api/mexc, эндпоинт = /v3/exchangeInfo
        // Прокси переписывает: /api/mexc/v3/exchangeInfo -> contract.mexc.com/api/v3/exchangeInfo
        // В dev-режиме без прокси: baseURL = contract.mexc.com, эндпоинт = /api/v3/exchangeInfo
        // В production: baseURL = contract.mexc.com, эндпоинт = /api/v3/exchangeInfo
        const endpoint = import.meta.env.DEV && USE_PROXY
          ? '/v3/exchangeInfo' // С прокси: прокси перепишет /api/mexc/v3/exchangeInfo -> /api/v3/exchangeInfo
          : '/api/v3/exchangeInfo'; // Без прокси: полный путь от корня contract.mexc.com

        logger.debug(`MEXC API: using endpoint ${endpoint}`);
        const response = await mexcClient.get(endpoint, { signal });

        // Проверяем структуру ответа
        if (!response.data || typeof response.data !== 'object') {
          logger.warn('MEXC API: response is not an object', response.data);
          return [];
        }

        // Валидация через Zod схему отключена, так как API возвращает данные,
        // которые не всегда соответствуют строгой схеме (например, baseAssetPrecision может быть 0)
        // Используем raw данные с ручной проверкой структуры

        const data = response.data as { symbols?: unknown[] };
        if (!data.symbols || !Array.isArray(data.symbols)) {
          logger.warn('MEXC API: symbols array not found or invalid', data);
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
            status: string | number; // MEXC возвращает "1" (строка) или 1 (число) для активных
            baseAsset?: string;
            quoteAsset?: string;
            isSpotTradingAllowed?: boolean;
          };

          // MEXC API: status "1" означает активный, isSpotTradingAllowed должен быть true
          const isActive =
            (symbol.status === '1' || symbol.status === 1) &&
            symbol.isSpotTradingAllowed !== false;

          // Валидация символа токена перед добавлением
          if (!validateTokenSymbol(symbol.baseAsset)) {
            return; // Пропускаем токены с некорректными символами (например, "420", "4")
          }

          if (symbol.symbol && isActive && symbol.baseAsset) {
            // Определяем блокчейн по contractAddress или другим полям
            // MEXC поддерживает оба блокчейна
            const chain: 'solana' | 'bsc' = 'bsc';

            // Если есть contractAddress, можно определить блокчейн
            // Но для простоты, если нет явного указания, используем BSC
            // Можно улучшить логику определения блокчейна

            const tokenSymbol = symbol.baseAsset.toUpperCase();
            if (tokenSymbol) {
              // Используем baseAsset как символ токена
              // Избегаем дубликатов, используя symbol+chain как ключ
              const key = `${tokenSymbol}-${chain}`;
              if (!tokensMap.has(key)) {
                tokensMap.set(key, {
                  symbol: tokenSymbol,
                  chain,
                });
              }
            }
          }
        });

        const result = Array.from(tokensMap.values());
        logger.debug(`MEXC API: successfully parsed ${result.length} unique tokens from ${data.symbols.length} symbols`);
        return result;
      } catch (error: unknown) {
        // Игнорируем CanceledError
        if (isCanceledError(error)) {
          logger.debug('MEXC tokens request was canceled');
          return [];
        }

        // Если основной эндпоинт не работает, логируем ошибку
        const initialStatusCode = getErrorStatusCode(error);
        const initialErrorCode = getErrorCode(error);
        logger.error(
          `Error fetching MEXC tokens: ${initialStatusCode || initialErrorCode || 'unknown'}`,
          error
        );
        return [];
      }
    },
    {
      priority: RequestPriority.NORMAL,
      maxRetries: 2,
      rateLimitKey: 'mexc-api',
    }
  );
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
    logger.info('Token fetch results:', {
      jupiter: jupiterTokens.length,
      pancake: pancakeTokens.length,
      mexc: mexcTokens.length,
      total: jupiterTokens.length + pancakeTokens.length + mexcTokens.length,
    });
    
    // Подсчитываем некорректные токены для отладки
    const invalidJupiter = jupiterTokens.filter((t) => !validateTokenSymbol(t.symbol)).length;
    const invalidPancake = pancakeTokens.filter((t) => !validateTokenSymbol(t.symbol)).length;
    const invalidMexc = mexcTokens.filter((t) => !validateTokenSymbol(t.symbol)).length;
    if (invalidJupiter > 0 || invalidPancake > 0 || invalidMexc > 0) {
      logger.debug(`Filtered invalid tokens: Jupiter=${invalidJupiter}, Pancake=${invalidPancake}, MEXC=${invalidMexc}`);
    }

    // Объединяем все токены, убираем дубликаты
    const allTokensMap = new Map<string, TokenWithData>();

    // Добавляем токены из Jupiter (Solana) с валидацией
    jupiterTokens
      .filter((token) => validateTokenSymbol(token.symbol))
      .forEach((token) => {
        const key = `${token.symbol}-${token.chain}`;
        if (!allTokensMap.has(key)) {
          allTokensMap.set(key, { ...token });
        }
      });

    // Добавляем токены из PancakeSwap (BSC) с валидацией
    pancakeTokens
      .filter((token) => validateTokenSymbol(token.symbol))
      .forEach((token) => {
        const key = `${token.symbol}-${token.chain}`;
        if (!allTokensMap.has(key)) {
          allTokensMap.set(key, { ...token });
        }
      });

    // Добавляем токены из MEXC (оба блокчейна) с валидацией
    mexcTokens
      .filter((token) => validateTokenSymbol(token.symbol))
      .forEach((token) => {
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

    // Возвращаем токены без данных о ценах/спредах
    // Данные будут загружаться постепенно через useTokensWithSpreads хук
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
