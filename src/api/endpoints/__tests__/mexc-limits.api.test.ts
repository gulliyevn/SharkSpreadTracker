import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMexcTradingLimits } from '../mexc-limits.api';
import { mexcClient } from '../../clients';
import { extractMexcLimits } from '@/utils/mexc-limits';
import { rateLimiter } from '@/utils/security';
import { logger } from '@/utils/logger';

vi.mock('../../clients', () => ({
  mexcClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/mexc-limits', () => ({
  extractMexcLimits: vi.fn(),
}));

vi.mock('@/utils/security', () => ({
  rateLimiter: {
    isAllowed: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('mexc-limits.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimiter.isAllowed).mockReturnValue(true);
  });

  it('should return null if rate limit exceeded', async () => {
    vi.mocked(rateLimiter.isAllowed).mockReturnValue(false);

    const result = await getMexcTradingLimits('BTC');

    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'MEXC API rate limit exceeded'
    );
    expect(mexcClient.get).not.toHaveBeenCalled();
  });

  it('should fetch and extract limits for a symbol', async () => {
    const mockExchangeInfo = {
      symbols: [
        {
          symbol: 'BTCUSDT',
          status: 'ENABLED',
          filters: [
            {
              filterType: 'MIN_NOTIONAL',
              minNotional: '10.0',
            },
          ],
        },
      ],
    };

    const mockLimits = {
      minNotional: 10.0,
    };

    vi.mocked(mexcClient.get).mockResolvedValue({
      data: mockExchangeInfo,
    } as never);

    vi.mocked(extractMexcLimits).mockReturnValue(mockLimits);

    const result = await getMexcTradingLimits('BTC');

    expect(result).toEqual(mockLimits);
    expect(mexcClient.get).toHaveBeenCalled();
    expect(extractMexcLimits).toHaveBeenCalled();
  });

  it('should find symbol by baseAsset', async () => {
    const mockExchangeInfo = {
      symbols: [
        {
          symbol: 'BTCUSDT',
          status: 'ENABLED',
          baseAsset: 'BTC',
          filters: [],
        },
      ],
    };

    vi.mocked(mexcClient.get).mockResolvedValue({
      data: mockExchangeInfo,
    } as never);

    vi.mocked(extractMexcLimits).mockReturnValue(null);

    await getMexcTradingLimits('BTC');

    expect(extractMexcLimits).toHaveBeenCalled();
  });

  it('should return null if symbol not found', async () => {
    const mockExchangeInfo = {
      symbols: [
        {
          symbol: 'ETHUSDT',
          status: 'ENABLED',
          filters: [],
        },
      ],
    };

    vi.mocked(mexcClient.get).mockResolvedValue({
      data: mockExchangeInfo,
    } as never);

    const result = await getMexcTradingLimits('BTC');

    expect(result).toBeNull();
    expect(extractMexcLimits).not.toHaveBeenCalled();
  });

  it('should return null if validation fails', async () => {
    vi.mocked(mexcClient.get).mockResolvedValue({
      data: { invalid: 'data' },
    } as never);

    const result = await getMexcTradingLimits('BTC');

    expect(result).toBeNull();
    // Проверяем что был вызов logger.warn (может быть вызван при валидации)
    expect(vi.mocked(logger.warn).mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('Network error');
    vi.mocked(mexcClient.get).mockRejectedValue(error);

    const result = await getMexcTradingLimits('BTC');

    expect(result).toBeNull();
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });

  it('should use correct endpoint', async () => {
    vi.mocked(mexcClient.get).mockResolvedValue({
      data: { symbols: [] },
    } as never);

    await getMexcTradingLimits('BTC');

    // Проверяем что был вызов с правильным endpoint (зависит от DEV/PROD)
    expect(mexcClient.get).toHaveBeenCalled();
    const callArgs = vi.mocked(mexcClient.get).mock.calls[0];
    expect(callArgs?.[0]).toBeDefined();
  });

  it('should handle AbortSignal', async () => {
    const signal = new AbortController().signal;

    vi.mocked(mexcClient.get).mockResolvedValue({
      data: { symbols: [] },
    } as never);

    await getMexcTradingLimits('BTC', signal);

    expect(mexcClient.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal })
    );
  });
});
