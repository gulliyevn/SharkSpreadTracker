/**
 * Mock-данные токенов для тестирования и разработки
 * Используются только когда все API вернули пустые результаты или при VITE_USE_MOCK_DATA=true
 */

import type { TokenWithData } from '@/types';

/**
 * Mock-данные токенов
 */
export const MOCK_TOKENS: TokenWithData[] = [
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
];
