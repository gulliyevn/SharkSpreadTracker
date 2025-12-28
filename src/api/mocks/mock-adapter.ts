/**
 * Мок-адаптер для разработки UI без подключения к бэкенду
 * Используется когда VITE_USE_MOCK_DATA=true
 */

import type {
  Token,
  SpreadResponse,
  TimeframeOption,
  MexcTradingLimits,
  StraightData,
  AllPrices,
} from '@/types';
import { logger } from '@/utils/logger';
import {
  MOCK_TOKENS,
  getMockSpreadResponse,
  getMockAllPrices,
  mockDelay,
} from './mock-data';

/**
 * Мок-реализация адаптера для разработки
 */
export class MockApiAdapter {
  async getAllTokens(_signal?: AbortSignal): Promise<StraightData[]> {
    logger.info('[Mock] getAllTokens called - returning mock data');
    await mockDelay(300); // Имитация сетевой задержки
    return [...MOCK_TOKENS];
  }

  async getAllPrices(token: Token, _signal?: AbortSignal): Promise<AllPrices> {
    logger.info(`[Mock] getAllPrices called for ${token.symbol} (${token.chain})`);
    await mockDelay(200);
    return getMockAllPrices(token);
  }

  async getSpreadData(
    token: Token,
    timeframe?: TimeframeOption,
    _signal?: AbortSignal
  ): Promise<SpreadResponse> {
    logger.info(
      `[Mock] getSpreadData called for ${token.symbol} (${token.chain}) with timeframe ${timeframe || '1h'}`
    );
    await mockDelay(400);
    return getMockSpreadResponse(token, timeframe || '1h');
  }

  async getSpreadsForTokens(
    tokens: Token[],
    _signal?: AbortSignal,
    _maxTokens?: number
  ): Promise<
    Array<
      Token & {
        directSpread: number | null;
        reverseSpread: number | null;
        price: number | null;
      }
    >
  > {
    logger.info(`[Mock] getSpreadsForTokens called for ${tokens.length} tokens`);
    await mockDelay(500);

    return tokens.map((token) => {
      const mockToken = MOCK_TOKENS.find(
        (t) =>
          t.token.toUpperCase() === token.symbol.toUpperCase() &&
          (t.network === token.chain ||
            (token.chain === 'bsc' && t.network === 'bep20'))
      );

      if (!mockToken) {
        return {
          ...token,
          directSpread: null,
          reverseSpread: null,
          price: null,
        };
      }

      const priceA = Number(mockToken.priceA);
      const priceB = Number(mockToken.priceB);
      const spread = Number(mockToken.spread);
      const price = (priceA + priceB) / 2;

      return {
        ...token,
        directSpread: spread,
        reverseSpread: -spread * 0.8, // Пример обратного спреда
        price,
      };
    });
  }

  async getMexcTradingLimits(
    _symbol: string,
    _signal?: AbortSignal
  ): Promise<MexcTradingLimits | null> {
    logger.info(`[Mock] getMexcTradingLimits called`);
    await mockDelay(200);
    return {
      minNotional: 5,
      minQty: 0.001,
      maxQty: 1000,
      stepSize: 0.0001,
    };
  }
}

