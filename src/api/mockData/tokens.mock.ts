/**
 * Mock-данные токенов для тестирования и разработки
 * Используются когда:
 * 1. VITE_USE_MOCK_DATA=true
 * 2. Бэкенд недоступен (fallback)
 * 3. WebSocket вернул пустой результат
 */

import type { TokenWithData } from '@/types';

/**
 * Mock-данные токенов (30+ токенов для полноценного тестирования UI)
 */
export const MOCK_TOKENS: TokenWithData[] = [
  // BSC токены
  {
    symbol: 'ARIAIP',
    chain: 'bsc',
    price: 0.0073,
    directSpread: 5.0,
    reverseSpread: 5.13,
  },
  {
    symbol: 'POP',
    chain: 'bsc',
    price: 0.0065,
    directSpread: 3.29,
    reverseSpread: 4.09,
  },
  {
    symbol: 'RION',
    chain: 'bsc',
    price: 0.0046,
    directSpread: 4.74,
    reverseSpread: 5.28,
  },
  {
    symbol: 'NB',
    chain: 'bsc',
    price: 0.0057,
    directSpread: 3.11,
    reverseSpread: 8.96,
  },
  {
    symbol: 'CAKE',
    chain: 'bsc',
    price: 2.45,
    directSpread: 0.15,
    reverseSpread: 0.12,
  },
  {
    symbol: 'BNB',
    chain: 'bsc',
    price: 615.42,
    directSpread: 0.05,
    reverseSpread: 0.04,
  },
  {
    symbol: 'XVS',
    chain: 'bsc',
    price: 8.73,
    directSpread: 0.45,
    reverseSpread: 0.52,
  },
  {
    symbol: 'ALPACA',
    chain: 'bsc',
    price: 0.187,
    directSpread: 1.23,
    reverseSpread: 1.45,
  },
  {
    symbol: 'BAKE',
    chain: 'bsc',
    price: 0.32,
    directSpread: 0.89,
    reverseSpread: 0.76,
  },
  {
    symbol: 'BURGER',
    chain: 'bsc',
    price: 0.45,
    directSpread: 1.56,
    reverseSpread: 1.34,
  },
  {
    symbol: 'TWT',
    chain: 'bsc',
    price: 1.12,
    directSpread: 0.34,
    reverseSpread: 0.28,
  },
  {
    symbol: 'DODO',
    chain: 'bsc',
    price: 0.145,
    directSpread: 0.67,
    reverseSpread: 0.54,
  },
  {
    symbol: 'LINA',
    chain: 'bsc',
    price: 0.0087,
    directSpread: 2.13,
    reverseSpread: 2.45,
  },
  {
    symbol: 'REEF',
    chain: 'bsc',
    price: 0.0023,
    directSpread: 3.21,
    reverseSpread: 2.98,
  },
  {
    symbol: 'SFP',
    chain: 'bsc',
    price: 0.78,
    directSpread: 0.56,
    reverseSpread: 0.67,
  },
  // Solana токены
  {
    symbol: 'SOL',
    chain: 'solana',
    price: 187.45,
    directSpread: 0.03,
    reverseSpread: 0.02,
  },
  {
    symbol: 'RAY',
    chain: 'solana',
    price: 4.56,
    directSpread: 0.23,
    reverseSpread: 0.19,
  },
  {
    symbol: 'SRM',
    chain: 'solana',
    price: 0.034,
    directSpread: 1.45,
    reverseSpread: 1.23,
  },
  {
    symbol: 'ORCA',
    chain: 'solana',
    price: 3.21,
    directSpread: 0.34,
    reverseSpread: 0.28,
  },
  {
    symbol: 'MNGO',
    chain: 'solana',
    price: 0.023,
    directSpread: 2.67,
    reverseSpread: 2.45,
  },
  {
    symbol: 'STEP',
    chain: 'solana',
    price: 0.045,
    directSpread: 1.89,
    reverseSpread: 1.56,
  },
  {
    symbol: 'COPE',
    chain: 'solana',
    price: 0.087,
    directSpread: 3.45,
    reverseSpread: 3.12,
  },
  {
    symbol: 'FIDA',
    chain: 'solana',
    price: 0.234,
    directSpread: 1.12,
    reverseSpread: 0.98,
  },
  {
    symbol: 'TULIP',
    chain: 'solana',
    price: 0.567,
    directSpread: 0.78,
    reverseSpread: 0.65,
  },
  {
    symbol: 'SLIM',
    chain: 'solana',
    price: 0.0034,
    directSpread: 4.56,
    reverseSpread: 4.12,
  },
  {
    symbol: 'ATLAS',
    chain: 'solana',
    price: 0.0045,
    directSpread: 2.34,
    reverseSpread: 2.12,
  },
  {
    symbol: 'POLIS',
    chain: 'solana',
    price: 0.145,
    directSpread: 1.67,
    reverseSpread: 1.45,
  },
  {
    symbol: 'PORT',
    chain: 'solana',
    price: 0.0123,
    directSpread: 3.78,
    reverseSpread: 3.45,
  },
  {
    symbol: 'SABER',
    chain: 'solana',
    price: 0.0056,
    directSpread: 2.89,
    reverseSpread: 2.67,
  },
  {
    symbol: 'SUNNY',
    chain: 'solana',
    price: 0.00012,
    directSpread: 5.67,
    reverseSpread: 5.23,
  },
];

/**
 * Получить mock токены с имитацией задержки сети
 */
export async function getMockTokens(delay = 500): Promise<TokenWithData[]> {
  await new Promise((resolve) => setTimeout(resolve, delay));
  
  // Добавляем небольшую случайность в цены и спреды
  return MOCK_TOKENS.map((token) => ({
    ...token,
    price: token.price ? token.price * (0.98 + Math.random() * 0.04) : null,
    directSpread: token.directSpread
      ? token.directSpread * (0.95 + Math.random() * 0.1)
      : null,
    reverseSpread: token.reverseSpread
      ? token.reverseSpread * (0.95 + Math.random() * 0.1)
      : null,
  }));
}
