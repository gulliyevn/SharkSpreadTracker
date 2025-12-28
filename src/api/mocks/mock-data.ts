/**
 * Мок-данные для разработки UI без подключения к бэкенду
 * Используется когда VITE_USE_MOCK_DATA=true
 */

import type { StraightData, SpreadResponse, AllPrices, Token, TimeframeOption } from '@/types';
import { TIMEFRAMES } from '@/constants/timeframes';

/**
 * Мок-данные для токенов (3-4 токена для демонстрации)
 */
export const MOCK_TOKENS: StraightData[] = [
  {
    token: 'BTC',
    aExchange: 'Jupiter',
    bExchange: 'MEXC',
    priceA: '67500.50',
    priceB: '67580.25',
    spread: '0.12',
    network: 'solana',
    limit: 'all',
  },
  {
    token: 'ETH',
    aExchange: 'PancakeSwap',
    bExchange: 'MEXC',
    priceA: '3450.75',
    priceB: '3458.90',
    spread: '0.24',
    network: 'bsc',
    limit: 'all',
  },
  {
    token: 'SOL',
    aExchange: 'Jupiter',
    bExchange: 'MEXC',
    priceA: '185.30',
    priceB: '186.15',
    spread: '0.46',
    network: 'solana',
    limit: 'all',
  },
  {
    token: 'BNB',
    aExchange: 'PancakeSwap',
    bExchange: 'MEXC',
    priceA: '625.40',
    priceB: '627.80',
    spread: '0.38',
    network: 'bsc',
    limit: 'all',
  },
];

/**
 * Генерирует мок-данные для SpreadResponse с поддержкой разных таймфреймов
 * Генерирует больше данных для лучшей имитации реального бэкенда
 */
export function getMockSpreadResponse(
  token: Token,
  timeframe: TimeframeOption = '1h'
): SpreadResponse {
  const mockToken = MOCK_TOKENS.find(
    (t) =>
      t.token.toUpperCase() === token.symbol.toUpperCase() &&
      (t.network === token.chain || (token.chain === 'bsc' && t.network === 'bep20'))
  );

  if (!mockToken) {
    return {
      symbol: token.symbol,
      chain: token.chain,
      history: [],
      current: null,
      sources: {
        mexc: false,
        jupiter: false,
        pancakeswap: false,
      },
    };
  }

  const priceA = Number(mockToken.priceA);
  const priceB = Number(mockToken.priceB);
  const isJupiter = mockToken.aExchange.toLowerCase().includes('jupiter');
  const isPancake = mockToken.aExchange.toLowerCase().includes('pancake');
  const isMEXC = mockToken.bExchange.toLowerCase().includes('mexc');

  const now = Date.now();
  const history: SpreadResponse['history'] = [];

  // Получаем интервал таймфрейма в минутах
  const intervalMinutes = TIMEFRAMES[timeframe].minutes;

  // Определяем количество точек и период истории в зависимости от таймфрейма
  const historyConfig: Record<TimeframeOption, { points: number; days: number }> = {
    '1m': { points: 1440, days: 1 }, // 1 день, каждая минута (1440 минут в дне)
    '5m': { points: 864, days: 3 }, // 3 дня, каждые 5 минут
    '15m': { points: 672, days: 7 }, // 7 дней, каждые 15 минут
    '1h': { points: 720, days: 30 }, // 30 дней, каждый час
    '4h': { points: 450, days: 75 }, // 75 дней, каждые 4 часа
    '1d': { points: 365, days: 365 }, // 1 год, каждый день
  };

  const config = historyConfig[timeframe];
  const intervalMs = intervalMinutes * 60 * 1000;

  // Генерируем исторические данные с правильными интервалами
  // Генерируем больше точек, чем нужно, чтобы было больше данных для фильтрации
  const totalPoints = config.points;
  
  for (let i = totalPoints; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    // Добавляем небольшую случайную вариацию для более реалистичных данных
    const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% вариация
    const trend = Math.sin((i / totalPoints) * Math.PI * 2) * 0.005; // Небольшой тренд
    const variation = randomVariation + trend;
    
    history.push({
      timestamp,
      mexc_price: isMEXC ? priceB * (1 + variation) : null,
      mexc_bid: isMEXC ? priceB * (1 + variation - 0.001) : null,
      mexc_ask: isMEXC ? priceB * (1 + variation + 0.001) : null,
      jupiter_price: isJupiter ? priceA * (1 + variation) : null,
      pancakeswap_price: isPancake ? priceA * (1 + variation) : null,
    });
  }

  return {
    symbol: token.symbol,
    chain: token.chain,
    history,
    current: {
      timestamp: now,
      mexc_price: isMEXC ? priceB : null,
      mexc_bid: isMEXC ? priceB * 0.999 : null,
      mexc_ask: isMEXC ? priceB * 1.001 : null,
      jupiter_price: isJupiter ? priceA : null,
      pancakeswap_price: isPancake ? priceA : null,
    },
    sources: {
      mexc: isMEXC,
      jupiter: isJupiter,
      pancakeswap: isPancake,
    },
  };
}

/**
 * Генерирует мок-данные для AllPrices
 */
export function getMockAllPrices(token: Token): AllPrices {
  const mockToken = MOCK_TOKENS.find(
    (t) =>
      t.token.toUpperCase() === token.symbol.toUpperCase() &&
      (t.network === token.chain || (token.chain === 'bsc' && t.network === 'bep20'))
  );

  if (!mockToken) {
    return {
      symbol: token.symbol,
      chain: token.chain,
      jupiter: null,
      pancakeswap: null,
      mexc: null,
      timestamp: Date.now(),
    };
  }

  const priceA = Number(mockToken.priceA);
  const priceB = Number(mockToken.priceB);
  const isJupiter = mockToken.aExchange.toLowerCase().includes('jupiter');
  const isPancake = mockToken.aExchange.toLowerCase().includes('pancake');
  const isMEXC = mockToken.bExchange.toLowerCase().includes('mexc');

  const now = Date.now();

  return {
    symbol: token.symbol,
    chain: token.chain,
    jupiter: isJupiter
      ? {
          price: priceA,
          bid: null,
          ask: null,
          timestamp: now,
          source: 'jupiter',
        }
      : null,
    pancakeswap: isPancake
      ? {
          price: priceA,
          bid: null,
          ask: null,
          timestamp: now,
          source: 'pancakeswap',
        }
      : null,
    mexc: isMEXC
      ? {
          price: priceB,
          bid: priceB * 0.999,
          ask: priceB * 1.001,
          timestamp: now,
          source: 'mexc',
        }
      : null,
    timestamp: now,
  };
}

/**
 * Задержка для имитации сетевого запроса
 */
export function mockDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

