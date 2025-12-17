import { jupiterClient, pancakeClient, mexcClient } from '../clients';
import type { Token } from '@/types';
import { isAxiosError, getErrorStatusCode, getErrorCode } from '@/utils/errors';
import { USE_MOCK_DATA } from '@/constants/api';
import { MOCK_TOKENS } from '../mockData/tokens.mock';

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
    if (isAxiosError(error) && getErrorStatusCode(error) === 404) {
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
        const fallbackStatusCode = getErrorStatusCode(fallbackError);
        console.error(
          `Error fetching Jupiter tokens (fallback): ${fallbackStatusCode || 'unknown'}`,
          fallbackError
        );
      }
    }
    const jupiterStatusCode = getErrorStatusCode(error);
    const jupiterErrorCode = getErrorCode(error);
    console.error(
      `Error fetching Jupiter tokens: ${jupiterStatusCode || jupiterErrorCode || 'unknown'}`,
      error
    );
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
    const pancakeStatusCode = getErrorStatusCode(error);
    const pancakeErrorCode = getErrorCode(error);
    console.error(
      `Error fetching PancakeSwap tokens: ${pancakeStatusCode || pancakeErrorCode || 'unknown'}`,
      error
    );
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
    const initialStatusCode = getErrorStatusCode(error);
    const initialErrorCode = getErrorCode(error);
    if (initialStatusCode === 404 || initialErrorCode === 'ECONNREFUSED') {
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
        const fallbackStatusCode = getErrorStatusCode(fallbackError);
        console.error(
          `Error fetching MEXC tokens (fallback): ${fallbackStatusCode || 'unknown'}`,
          fallbackError
        );
      }
    }
    console.error(
      `Error fetching MEXC tokens: ${initialStatusCode || initialErrorCode || 'unknown'}`,
      error
    );
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
    // Только если USE_MOCK_DATA=true или если все источники вернули пустые результаты
    if (result.length === 0 && USE_MOCK_DATA) {
      console.warn(
        'All API endpoints returned empty results. Using mock data (VITE_USE_MOCK_DATA=true).'
      );
      return MOCK_TOKENS;
    }

    return result;
  } catch (error) {
    const allTokensStatusCode = getErrorStatusCode(error);
    const allTokensErrorCode = getErrorCode(error);
    console.error(
      `Error fetching all tokens: ${allTokensStatusCode || allTokensErrorCode || 'unknown'}`,
      error
    );
    // В случае ошибки возвращаем моковые данные только если флаг установлен
    if (USE_MOCK_DATA) {
      console.warn('Using mock data due to API errors (VITE_USE_MOCK_DATA=true)');
      return MOCK_TOKENS;
    }
    return [];
  }
}
