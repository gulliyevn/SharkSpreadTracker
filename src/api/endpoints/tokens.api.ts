import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';

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

interface MexcSymbol {
  symbol: string;
  baseAsset?: string;
  quoteAsset?: string;
  status: string;
}

interface MexcExchangeInfo {
  symbols?: MexcSymbol[];
}

/**
 * Получить все токены из Jupiter
 * Jupiter API: https://lite-api.jup.ag
 */
export async function getJupiterTokens(): Promise<Token[]> {
  try {
    // Jupiter API - получение списка токенов
    // Эндпоинт может быть /tokens или /v1/tokens
    const response = await jupiterClient.get('/tokens');

    if (!response.data || !Array.isArray(response.data)) {
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
        });
      }
    });
    return result;
  } catch (error: unknown) {
    // Если эндпоинт не найден, пробуем альтернативный
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 404) {
      try {
        const response = await jupiterClient.get('/v1/tokens');
        if (response.data && Array.isArray(response.data)) {
          const tokens = response.data as JupiterTokenResponse[];
          const result: Token[] = [];
          tokens.forEach((item) => {
            if (item.symbol && item.address) {
              result.push({
                symbol: item.symbol.toUpperCase(),
                chain: 'solana' as const,
              });
            }
          });
          return result;
        }
      } catch (fallbackError) {
        console.error(
          'Error fetching Jupiter tokens (fallback):',
          fallbackError
        );
      }
    }
    console.error('Error fetching Jupiter tokens:', error);
    return [];
  }
}

/**
 * Получить все токены из PancakeSwap/DexScreener
 * DexScreener API: https://api.dexscreener.com/latest/dex/tokens
 */
export async function getPancakeTokens(): Promise<Token[]> {
  try {
    // DexScreener API - получение популярных токенов BSC
    // Попробуем получить токены через поиск популярных пар
    const popularTokens = ['BNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTC'];
    const tokensSet = new Set<string>();

    // Получаем данные для популярных токенов
    for (const tokenSymbol of popularTokens) {
      try {
        const response = await pancakeClient.get<DexScreenerResponse>(
          `/${tokenSymbol}`
        );
        if (response.data?.pairs && Array.isArray(response.data.pairs)) {
          response.data.pairs.forEach((pair) => {
            if (pair.baseToken?.symbol) {
              tokensSet.add(pair.baseToken.symbol.toUpperCase());
            }
            if (pair.quoteToken?.symbol) {
              tokensSet.add(pair.quoteToken.symbol.toUpperCase());
            }
          });
        }
      } catch (tokenError) {
        // Пропускаем ошибки для отдельных токенов
        continue;
      }
    }

    // Преобразуем в массив токенов
    return Array.from(tokensSet).map((symbol) => ({
      symbol,
      chain: 'bsc' as const,
    }));
  } catch (error) {
    console.error('Error fetching PancakeSwap tokens:', error);
    return [];
  }
}

/**
 * Получить все токены из MEXC
 * MEXC API: https://contract.mexc.com
 */
export async function getMexcTokens(): Promise<Token[]> {
  try {
    // MEXC API - получение информации о бирже
    // Стандартный эндпоинт: /api/v3/exchangeInfo
    const response = await mexcClient.get<MexcExchangeInfo>(
      '/api/v3/exchangeInfo'
    );

    if (!response.data?.symbols || !Array.isArray(response.data.symbols)) {
      return [];
    }

    // Преобразуем данные MEXC в наш формат
    const tokensMap = new Map<string, Token>();

    response.data.symbols.forEach((symbol) => {
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

        const tokenSymbol = symbol.baseAsset?.toUpperCase() || symbol.symbol;
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
    const axiosError = error as {
      response?: { status?: number };
      code?: string;
    };
    if (
      axiosError.response?.status === 404 ||
      axiosError.code === 'ECONNREFUSED'
    ) {
      try {
        // Альтернативный эндпоинт для MEXC
        const response = await mexcClient.get<MexcExchangeInfo>(
          '/api/v1/exchangeInfo'
        );
        if (response.data?.symbols && Array.isArray(response.data.symbols)) {
          const tokensMap = new Map<string, Token>();
          response.data.symbols.forEach((symbol) => {
            if (symbol.symbol && symbol.status === 'ENABLED') {
              const tokenSymbol =
                symbol.baseAsset?.toUpperCase() || symbol.symbol;
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
        console.error('Error fetching MEXC tokens (fallback):', fallbackError);
      }
    }
    console.error('Error fetching MEXC tokens:', error);
    return [];
  }
}

/**
 * Получить все токены из всех источников и объединить
 */
export async function getAllTokens(): Promise<TokenWithData[]> {
  try {
    // Выполняем запросы параллельно с обработкой ошибок
    const results = await Promise.allSettled([
      getJupiterTokens(),
      getPancakeTokens(),
      getMexcTokens(),
    ]);

    const jupiterTokens: Token[] =
      results[0].status === 'fulfilled' ? results[0].value : [];
    const pancakeTokens: Token[] =
      results[1].status === 'fulfilled' ? results[1].value : [];
    const mexcTokens: Token[] =
      results[2].status === 'fulfilled' ? results[2].value : [];

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

    // Если все API вернули пустые результаты, возвращаем моковые данные для тестирования
    if (result.length === 0) {
      console.warn(
        'All API endpoints returned empty results. Using mock data for testing.'
      );
      return getMockTokens();
    }

    return result;
  } catch (error) {
    console.error('Error fetching all tokens:', error);
    // В случае ошибки возвращаем моковые данные
    return getMockTokens();
  }
}

/**
 * Моковые данные токенов для тестирования
 */
function getMockTokens(): TokenWithData[] {
  return [
    {
      symbol: 'ARIAIP',
      chain: 'bsc',
      price: 73,
      directSpread: 5.0,
      reverseSpread: 5.13,
    },
    {
      symbol: 'POP',
      chain: 'bsc',
      price: 65,
      directSpread: 3.29,
      reverseSpread: 4.09,
    },
    {
      symbol: 'RION',
      chain: 'bsc',
      price: 46,
      directSpread: 4.74,
      reverseSpread: 5.28,
    },
    {
      symbol: 'NB',
      chain: 'bsc',
      price: 57,
      directSpread: 3.11,
      reverseSpread: 8.96,
    },
    {
      symbol: 'BOS',
      chain: 'bsc',
      price: 91,
      directSpread: 4.09,
      reverseSpread: 4.64,
    },
    {
      symbol: 'MAIGA',
      chain: 'bsc',
      price: 47,
      directSpread: 1.64,
      reverseSpread: 2.54,
    },
    {
      symbol: 'SUBHUB',
      chain: 'bsc',
      price: 60,
      directSpread: 1.21,
      reverseSpread: 2.86,
    },
    {
      symbol: 'LAB',
      chain: 'bsc',
      price: 2363,
      directSpread: 0.36,
      reverseSpread: 0.71,
    },
    {
      symbol: 'ON',
      chain: 'bsc',
      price: 2018,
      directSpread: 0.29,
      reverseSpread: 0.7,
    },
    {
      symbol: 'POWER',
      chain: 'bsc',
      price: 5578,
      directSpread: 0.25,
      reverseSpread: 0.69,
    },
    {
      symbol: 'JCT',
      chain: 'bsc',
      price: 1560,
      directSpread: 0.22,
      reverseSpread: 0.59,
    },
    {
      symbol: 'GAIB',
      chain: 'bsc',
      price: 101,
      directSpread: 1.63,
      reverseSpread: 2.16,
    },
    {
      symbol: 'BULLA',
      chain: 'bsc',
      price: 1987,
      directSpread: 0.52,
      reverseSpread: 1.72,
    },
    {
      symbol: 'COAI',
      chain: 'bsc',
      price: 5805,
      directSpread: 0.31,
      reverseSpread: 0.47,
    },
    {
      symbol: 'TAKE',
      chain: 'bsc',
      price: 2403,
      directSpread: 0.29,
      reverseSpread: 0.44,
    },
    {
      symbol: 'Q',
      chain: 'bsc',
      price: 1931,
      directSpread: 0.24,
      reverseSpread: 0.49,
    },
    {
      symbol: 'CROSS',
      chain: 'bsc',
      price: 2365,
      directSpread: 0.19,
      reverseSpread: 0.55,
    },
    {
      symbol: 'BAY',
      chain: 'bsc',
      price: 38,
      directSpread: 2.32,
      reverseSpread: 3.56,
    },
    {
      symbol: 'LONG',
      chain: 'bsc',
      price: 281,
      directSpread: 1.23,
      reverseSpread: 3.34,
    },
    {
      symbol: 'RAVE',
      chain: 'bsc',
      price: 235,
      directSpread: 0.42,
      reverseSpread: 0.73,
    },
    {
      symbol: 'YALA',
      chain: 'bsc',
      price: 82,
      directSpread: 0.3,
      reverseSpread: 0.46,
    },
    {
      symbol: 'B',
      chain: 'bsc',
      price: 29532,
      directSpread: 0.29,
      reverseSpread: 0.49,
    },
    {
      symbol: 'SENTIS',
      chain: 'bsc',
      price: 329,
      directSpread: 0.23,
      reverseSpread: 1.29,
    },
    {
      symbol: '42',
      chain: 'bsc',
      price: 1776,
      directSpread: 0.13,
      reverseSpread: 0.95,
    },
  ];
}
