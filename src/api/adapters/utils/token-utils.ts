/**
 * Утилиты для работы с токенами
 */

import type { Token, StraightData } from '@/types';

/**
 * Нормализует network в chain
 */
export function networkToChain(network: string | null | undefined): 'solana' | 'bsc' {
  const normalized = (network || '').toLowerCase();
  return normalized === 'bsc' || normalized === 'bep20' ? 'bsc' : 'solana';
}

/**
 * Нормализует chain в network
 */
export function chainToNetwork(chain: 'solana' | 'bsc'): string {
  return chain === 'bsc' ? 'bsc' : 'solana';
}

/**
 * Нормализует символ токена (верхний регистр, trim)
 */
export function normalizeSymbol(symbol: string | null | undefined): string {
  return (symbol || '').toUpperCase().trim();
}

/**
 * Нормализует network (нижний регистр)
 */
export function normalizeNetwork(network: string | null | undefined): string {
  return (network || '').toLowerCase();
}

/**
 * Проверяет, соответствует ли StraightData токену
 */
export function matchesToken(row: StraightData, token: Token): boolean {
  const rowSymbol = normalizeSymbol(row.token);
  const rowNetwork = normalizeNetwork(row.network);
  const tokenSymbol = normalizeSymbol(token.symbol);
  const tokenNetwork = chainToNetwork(token.chain);
  
  return rowSymbol === tokenSymbol && rowNetwork === tokenNetwork;
}

/**
 * Фильтрует строки по токену
 */
export function filterByToken(rows: StraightData[], token: Token): StraightData[] {
  return rows.filter((row) => matchesToken(row, token));
}

/**
 * Фильтрует строки по символу и network
 */
export function filterBySymbolAndNetwork(
  rows: StraightData[],
  symbol: string,
  network: string
): StraightData[] {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedNetwork = normalizeNetwork(network);
  
  return rows.filter(
    (row) =>
      normalizeSymbol(row.token) === normalizedSymbol &&
      normalizeNetwork(row.network) === normalizedNetwork
  );
}

/**
 * Извлекает валидные цены из строки
 */
export function extractValidPrices(row: StraightData): number[] {
  const prices: number[] = [];
  
  if (row.priceA) {
    const priceA = Number(row.priceA);
    if (Number.isFinite(priceA) && priceA > 0) {
      prices.push(priceA);
    }
  }
  
  if (row.priceB) {
    const priceB = Number(row.priceB);
    if (Number.isFinite(priceB) && priceB > 0) {
      prices.push(priceB);
    }
  }
  
  return prices;
}

/**
 * Вычисляет среднюю цену из массива цен
 */
export function calculateAveragePrice(prices: number[]): number | null {
  if (prices.length === 0) return null;
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

/**
 * Извлекает лучший спред из массива строк
 */
export function extractBestSpread(rows: StraightData[]): number | null {
  return rows.reduce<number | null>((acc, row) => {
    const spread = row.spread ? Number(row.spread) : null;
    if (spread == null || !Number.isFinite(spread)) return acc;
    if (acc == null) return spread;
    return Math.max(acc, spread);
  }, null);
}

