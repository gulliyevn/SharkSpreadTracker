import { describe, it, expect } from 'vitest';
import {
  TIMEFRAMES,
  TIMEFRAME_OPTIONS,
  getTimeframeConfig,
} from '../timeframes';

describe('timeframes', () => {
  describe('TIMEFRAMES', () => {
    it('should have all required timeframes', () => {
      expect(TIMEFRAMES['1m']).toBeDefined();
      expect(TIMEFRAMES['5m']).toBeDefined();
      expect(TIMEFRAMES['15m']).toBeDefined();
      expect(TIMEFRAMES['1h']).toBeDefined();
      expect(TIMEFRAMES['4h']).toBeDefined();
      expect(TIMEFRAMES['1d']).toBeDefined();
    });

    it('should have correct structure for 1m', () => {
      expect(TIMEFRAMES['1m']).toEqual({
        value: '1m',
        label: '1 минута',
        minutes: 1,
      });
    });

    it('should have correct minutes values', () => {
      expect(TIMEFRAMES['1m'].minutes).toBe(1);
      expect(TIMEFRAMES['5m'].minutes).toBe(5);
      expect(TIMEFRAMES['15m'].minutes).toBe(15);
      expect(TIMEFRAMES['1h'].minutes).toBe(60);
      expect(TIMEFRAMES['4h'].minutes).toBe(240);
      expect(TIMEFRAMES['1d'].minutes).toBe(1440);
    });
  });

  describe('TIMEFRAME_OPTIONS', () => {
    it('should contain all timeframe options', () => {
      expect(TIMEFRAME_OPTIONS).toEqual([
        '1m',
        '5m',
        '15m',
        '1h',
        '4h',
        '1d',
      ]);
    });
  });

  describe('getTimeframeConfig', () => {
    it('should return correct config for 1m', () => {
      const config = getTimeframeConfig('1m');
      expect(config.value).toBe('1m');
      expect(config.minutes).toBe(1);
    });

    it('should return correct config for 1h', () => {
      const config = getTimeframeConfig('1h');
      expect(config.value).toBe('1h');
      expect(config.minutes).toBe(60);
    });

    it('should return correct config for 1d', () => {
      const config = getTimeframeConfig('1d');
      expect(config.value).toBe('1d');
      expect(config.minutes).toBe(1440);
    });
  });
});

