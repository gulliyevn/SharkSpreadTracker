// import { jupiterClient, pancakeClient, mexcClient } from '../clients';
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
 * Получить все токены из Jupiter
 */
export async function getJupiterTokens(): Promise<Token[]> {
  try {
    // TODO: Заменить на реальный эндпоинт Jupiter API
    // Пример: const response = await jupiterClient.get('/tokens');
    // return response.data;
    
    // Временная заглушка
    return [];
  } catch (error) {
    console.error('Error fetching Jupiter tokens:', error);
    return [];
  }
}

/**
 * Получить все токены из PancakeSwap/DexScreener
 */
export async function getPancakeTokens(): Promise<Token[]> {
  try {
    // TODO: Заменить на реальный эндпоинт DexScreener API
    // Пример: const response = await pancakeClient.get('/tokens');
    // return response.data;
    
    // Временная заглушка
    return [];
  } catch (error) {
    console.error('Error fetching PancakeSwap tokens:', error);
    return [];
  }
}

/**
 * Получить все токены из MEXC
 */
export async function getMexcTokens(): Promise<Token[]> {
  try {
    // TODO: Заменить на реальный эндпоинт MEXC API
    // Пример: const response = await mexcClient.get('/api/v3/exchangeInfo');
    // return response.data.symbols.map(...);
    
    // Временная заглушка
    return [];
  } catch (error) {
    console.error('Error fetching MEXC tokens:', error);
    return [];
  }
}

/**
 * Получить все токены из всех источников и объединить
 */
export async function getAllTokens(): Promise<TokenWithData[]> {
  try {
    const [jupiterTokens, pancakeTokens, mexcTokens] = await Promise.all([
      getJupiterTokens(),
      getPancakeTokens(),
      getMexcTokens(),
    ]);

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

    return Array.from(allTokensMap.values());
  } catch (error) {
    console.error('Error fetching all tokens:', error);
    return [];
  }
}

