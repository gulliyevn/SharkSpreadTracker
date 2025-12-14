import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSpreadData } from '../useSpreadData';
import { getSpreadData } from '../../endpoints/spreads.api';
import type { Token } from '@/types';

vi.mock('../../endpoints/spreads.api', () => ({
  getSpreadData: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('useSpreadData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch spread data when token is provided', async () => {
    const mockToken: Token = { symbol: 'BTC', chain: 'solana' };
    const mockSpreadData = {
      symbol: 'BTC',
      chain: 'solana' as const,
      history: [],
      current: {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 50100,
        pancakeswap_price: null,
        mexc_bid: null,
        mexc_ask: null,
      },
      sources: {
        mexc: true,
        jupiter: true,
        pancakeswap: false,
      },
    };

    vi.mocked(getSpreadData).mockResolvedValue(mockSpreadData);

    const { result } = renderHook(() => useSpreadData(mockToken), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSpreadData);
    expect(getSpreadData).toHaveBeenCalledWith(mockToken, '1h');
  });

  it('should not fetch when token is null', () => {
    const { result } = renderHook(() => useSpreadData(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getSpreadData).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockToken: Token = { symbol: 'BTC', chain: 'solana' };
    vi.mocked(getSpreadData).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useSpreadData(mockToken), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

