import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSpreadHistoryPoint,
  loadSpreadHistory,
  clearSpreadHistory,
  loadAllSpreadHistory,
  updateSpreadHistory,
} from '../spreadHistory';
import type { Token, SpreadDataPoint, TimeframeOption } from '@/types';
import { logger } from '../logger';

vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockToken: Token = {
  symbol: 'BTC',
  chain: 'solana',
};

describe('spreadHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveSpreadHistoryPoint', () => {
    it('should save a data point to localStorage', () => {
      const dataPoint: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      saveSpreadHistoryPoint(mockToken, '1h', dataPoint);

      const saved = loadSpreadHistory(mockToken, '1h');
      expect(saved).toHaveLength(1);
      expect(saved[0]).toEqual(dataPoint);
    });

    it('should not save if interval has not passed', () => {
      const dataPoint1: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      const dataPoint2: SpreadDataPoint = {
        timestamp: Date.now() + 1000, // 1 секунда позже (меньше интервала 1h)
        mexc_price: 50010,
        jupiter_price: 50110,
        pancakeswap_price: null,
      };

      saveSpreadHistoryPoint(mockToken, '1h', dataPoint1);
      saveSpreadHistoryPoint(mockToken, '1h', dataPoint2);

      const saved = loadSpreadHistory(mockToken, '1h');
      expect(saved).toHaveLength(1); // Только первая точка сохранена
    });

    it('should trim to max points', () => {
      const maxPoints = 60; // для '1m'
      const dataPoints: SpreadDataPoint[] = Array.from({ length: maxPoints + 10 }, (_, i) => ({
        timestamp: Date.now() + i * 60000, // каждая точка через минуту
        mexc_price: 50000 + i,
        jupiter_price: 50100 + i,
        pancakeswap_price: null,
      }));

      dataPoints.forEach((point) => {
        saveSpreadHistoryPoint(mockToken, '1m', point);
      });

      const saved = loadSpreadHistory(mockToken, '1m');
      expect(saved.length).toBeLessThanOrEqual(maxPoints);
    });

    it('should handle localStorage errors gracefully', () => {
      // Мокаем localStorage.setItem чтобы выбросить ошибку
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const dataPoint: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      expect(() => {
        saveSpreadHistoryPoint(mockToken, '1h', dataPoint);
      }).not.toThrow();

      expect(vi.mocked(logger.error)).toHaveBeenCalled();

      setItemSpy.mockRestore();
    });
  });

  describe('loadSpreadHistory', () => {
    it('should return empty array if no data exists', () => {
      const result = loadSpreadHistory(mockToken, '1h');
      expect(result).toEqual([]);
    });

    it('should load saved history', () => {
      const dataPoint: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      saveSpreadHistoryPoint(mockToken, '1h', dataPoint);
      const loaded = loadSpreadHistory(mockToken, '1h');

      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(dataPoint);
    });

    it('should filter old points based on timeframe', () => {
      const oldPoint: SpreadDataPoint = {
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 дней назад
        mexc_price: 40000,
        jupiter_price: 40100,
        pancakeswap_price: null,
      };

      const newPoint: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      // Сохраняем напрямую в localStorage для теста
      const key = `spread-history-${mockToken.symbol}-${mockToken.chain}-1h`;
      localStorage.setItem(key, JSON.stringify([oldPoint, newPoint]));

      const loaded = loadSpreadHistory(mockToken, '1h');
      // Старая точка должна быть отфильтрована
      expect(loaded.length).toBeLessThanOrEqual(1);
    });

    it('should handle invalid JSON gracefully', () => {
      const key = `spread-history-${mockToken.symbol}-${mockToken.chain}-1h`;
      localStorage.setItem(key, 'invalid json');

      const result = loadSpreadHistory(mockToken, '1h');
      expect(result).toEqual([]);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });

    it('should handle non-array data gracefully', () => {
      const key = `spread-history-${mockToken.symbol}-${mockToken.chain}-1h`;
      localStorage.setItem(key, JSON.stringify({ not: 'an array' }));

      const result = loadSpreadHistory(mockToken, '1h');
      expect(result).toEqual([]);
    });
  });

  describe('clearSpreadHistory', () => {
    it('should clear history for specific timeframe', () => {
      const dataPoint: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      saveSpreadHistoryPoint(mockToken, '1h', dataPoint);
      expect(loadSpreadHistory(mockToken, '1h')).toHaveLength(1);

      clearSpreadHistory(mockToken, '1h');
      expect(loadSpreadHistory(mockToken, '1h')).toHaveLength(0);
    });

    it('should clear all timeframes when timeframe is not specified', () => {
      const timeframes: TimeframeOption[] = ['1h', '4h', '1d'];

      timeframes.forEach((tf) => {
        const dataPoint: SpreadDataPoint = {
          timestamp: Date.now(),
          mexc_price: 50000,
          jupiter_price: 50100,
          pancakeswap_price: null,
        };
        saveSpreadHistoryPoint(mockToken, tf, dataPoint);
      });

      clearSpreadHistory(mockToken);

      timeframes.forEach((tf) => {
        expect(loadSpreadHistory(mockToken, tf)).toHaveLength(0);
      });
    });

    it('should handle errors gracefully', () => {
      // Мокаем localStorage.removeItem чтобы выбросить ошибку
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => {
        clearSpreadHistory(mockToken, '1h');
      }).not.toThrow();

      expect(vi.mocked(logger.error)).toHaveBeenCalled();

      removeItemSpy.mockRestore();
    });
  });

  describe('loadAllSpreadHistory', () => {
    it('should load history for all timeframes', () => {
      const timeframes: TimeframeOption[] = ['1h', '4h', '1d'];

      timeframes.forEach((tf) => {
        const dataPoint: SpreadDataPoint = {
          timestamp: Date.now(),
          mexc_price: 50000,
          jupiter_price: 50100,
          pancakeswap_price: null,
        };
        saveSpreadHistoryPoint(mockToken, tf, dataPoint);
      });

      const allHistory = loadAllSpreadHistory(mockToken);

      expect(allHistory).toHaveProperty('1h');
      expect(allHistory).toHaveProperty('4h');
      expect(allHistory).toHaveProperty('1d');
      expect(allHistory['1h']).toHaveLength(1);
      expect(allHistory['4h']).toHaveLength(1);
      expect(allHistory['1d']).toHaveLength(1);
    });
  });

  describe('updateSpreadHistory', () => {
    it('should call saveSpreadHistoryPoint', () => {
      const dataPoint: SpreadDataPoint = {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
      };

      updateSpreadHistory(mockToken, dataPoint, '1h');

      const saved = loadSpreadHistory(mockToken, '1h');
      expect(saved.length).toBeGreaterThan(0);
    });
  });
});
