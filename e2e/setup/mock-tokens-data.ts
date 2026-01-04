/**
 * Моковые данные токенов для E2E тестов
 */

export interface MockStraightData {
  token: string;
  network: string;
  priceA: string;
  priceB: string;
  spread: number;
  limit: string;
}

export const mockTokensData: MockStraightData[] = [
  {
    token: 'BTC',
    network: 'solana',
    priceA: '50000',
    priceB: '51000',
    spread: 2.0,
    limit: '1000000',
  },
  {
    token: 'ETH',
    network: 'solana',
    priceA: '3000',
    priceB: '3100',
    spread: 3.33,
    limit: '500000',
  },
  {
    token: 'USDC',
    network: 'solana',
    priceA: '1.0',
    priceB: '1.01',
    spread: 1.0,
    limit: '10000000',
  },
  {
    token: 'BNB',
    network: 'bsc',
    priceA: '400',
    priceB: '410',
    spread: 2.5,
    limit: '500000',
  },
  {
    token: 'CAKE',
    network: 'bsc',
    priceA: '2.5',
    priceB: '2.6',
    spread: 4.0,
    limit: '100000',
  },
];

