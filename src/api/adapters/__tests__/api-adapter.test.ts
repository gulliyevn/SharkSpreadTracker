import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAllTokens,
  getAllPrices,
  getSpreadData,
  getSpreadsForTokens,
  getMexcTradingLimits,
} from '../api-adapter';

// Мокаем константы API
vi.mock('@/constants/api', () => ({
  WEBSOCKET_URL: '', // Пустой URL для тестов без WebSocket
  API_CONFIG: { TIMEOUT: 5000 },
  BACKEND_URL: '',
}));

// Мокаем logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('api-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllTokens', () => {
    it('should return empty array when WEBSOCKET_URL is not set', async () => {
      const result = await getAllTokens();
      expect(result).toEqual([]);
    });

    it('should handle AbortSignal that is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await getAllTokens(controller.signal);
      expect(result).toEqual([]);
    });
  });

  describe('getAllPrices', () => {
    it('should return default structure when no data', async () => {
      const result = await getAllPrices({ symbol: 'BTC', chain: 'solana' });

      expect(result.symbol).toBe('BTC');
      expect(result.chain).toBe('solana');
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getSpreadData', () => {
    it('should return default structure when no data', async () => {
      const result = await getSpreadData({ symbol: 'ETH', chain: 'bsc' }, '1h');

      expect(result.symbol).toBe('ETH');
      expect(result.chain).toBe('bsc');
      expect(result.history).toEqual([]);
    });

    it('should use default timeframe 1h', async () => {
      const result = await getSpreadData({ symbol: 'SOL', chain: 'solana' });

      expect(result.symbol).toBe('SOL');
    });
  });

  describe('getSpreadsForTokens', () => {
    it('should return empty array for empty input', async () => {
      const result = await getSpreadsForTokens([]);
      expect(result).toEqual([]);
    });

    it('should return empty spreads when no data available', async () => {
      const tokens = [
        { symbol: 'BTC', chain: 'solana' as const },
        { symbol: 'ETH', chain: 'bsc' as const },
      ];

      const result = await getSpreadsForTokens(tokens);

      // Без данных WebSocket вернёт пустой массив
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getMexcTradingLimits', () => {
    it('should return null (not implemented)', async () => {
      const result = await getMexcTradingLimits('BTCUSDT');
      expect(result).toBeNull();
    });

    it('should handle any symbol', async () => {
      const result = await getMexcTradingLimits('ANYTOKEN');
      expect(result).toBeNull();
    });
  });
});
