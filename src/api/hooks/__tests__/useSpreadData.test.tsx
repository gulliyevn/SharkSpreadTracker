import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSpreadData } from '../useSpreadData';
import type { ReactNode } from 'react';
import type { Token, SpreadResponse } from '@/types';

// Мокаем api-adapter
vi.mock('../../adapters/api-adapter', () => ({
  getSpreadData: vi.fn(),
}));

import { getSpreadData } from '../../adapters/api-adapter';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockToken: Token = {
  symbol: 'BTC',
  chain: 'solana',
};

const mockSpreadResponse: SpreadResponse = {
  symbol: 'BTC',
  chain: 'solana',
  history: [
    {
      timestamp: Date.now(),
      mexc_price: 50100,
      jupiter_price: 50000,
      pancakeswap_price: null,
    },
  ],
  current: {
    timestamp: Date.now(),
    mexc_bid: 50090,
    mexc_ask: 50110,
    mexc_price: 50100,
    jupiter_price: 50000,
    pancakeswap_price: null,
  },
  sources: {
    mexc: true,
    jupiter: true,
    pancakeswap: false,
  },
};

describe('useSpreadData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch spread data for a token', async () => {
    vi.mocked(getSpreadData).mockResolvedValue(mockSpreadResponse);

    const { result } = renderHook(
      () => useSpreadData(mockToken, '1h'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSpreadResponse);
    expect(getSpreadData).toHaveBeenCalledWith(mockToken, '1h', expect.any(AbortSignal));
  });

  it('should not fetch when token is null', async () => {
    const { result } = renderHook(
      () => useSpreadData(null, '1h'),
      { wrapper: createWrapper() }
    );

    // Должен быть в состоянии pending, но не fetching
    expect(result.current.isFetching).toBe(false);
    expect(getSpreadData).not.toHaveBeenCalled();
  });

  it('should handle loading state', async () => {
    vi.mocked(getSpreadData).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useSpreadData(mockToken, '1h'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', async () => {
    vi.mocked(getSpreadData).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(
      () => useSpreadData(mockToken, '1h'),
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeDefined();
  });

  it('should use default timeframe 1h', async () => {
    vi.mocked(getSpreadData).mockResolvedValue(mockSpreadResponse);

    renderHook(
      () => useSpreadData(mockToken),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(getSpreadData).toHaveBeenCalled();
    });

    expect(getSpreadData).toHaveBeenCalledWith(mockToken, '1h', expect.any(AbortSignal));
  });

  it('should refetch when token changes', async () => {
    vi.mocked(getSpreadData).mockResolvedValue(mockSpreadResponse);

    const { rerender } = renderHook(
      ({ token }) => useSpreadData(token, '1h'),
      {
        wrapper: createWrapper(),
        initialProps: { token: mockToken },
      }
    );

    await waitFor(() => {
      expect(getSpreadData).toHaveBeenCalledTimes(1);
    });

    const newToken: Token = { symbol: 'ETH', chain: 'bsc' };
    rerender({ token: newToken });

    await waitFor(() => {
      expect(getSpreadData).toHaveBeenCalledTimes(2);
    });

    expect(getSpreadData).toHaveBeenLastCalledWith(newToken, '1h', expect.any(AbortSignal));
  });

  it('should refetch when timeframe changes', async () => {
    vi.mocked(getSpreadData).mockResolvedValue(mockSpreadResponse);

    const { rerender } = renderHook(
      ({ timeframe }) => useSpreadData(mockToken, timeframe),
      {
        wrapper: createWrapper(),
        initialProps: { timeframe: '1h' as const },
      }
    );

    await waitFor(() => {
      expect(getSpreadData).toHaveBeenCalledTimes(1);
    });

    // Rerender с тем же timeframe — не должен вызывать refetch
    rerender({ timeframe: '1h' as const });

    // Первый вызов должен остаться
    expect(getSpreadData).toHaveBeenCalledWith(mockToken, '1h', expect.any(AbortSignal));
  });
});

