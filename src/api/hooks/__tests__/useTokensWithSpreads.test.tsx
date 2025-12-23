import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTokensWithSpreads } from '../useTokensWithSpreads';
import type { ReactNode } from 'react';

// Мокаем useTokens
vi.mock('../useTokens', () => ({
  useTokens: vi.fn(),
}));

import { useTokens } from '../useTokens';

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

describe('useTokensWithSpreads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return tokens with spreads', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const, price: 50000, directSpread: 0.5 },
      { symbol: 'ETH', chain: 'bsc' as const, price: 3000, directSpread: 0.3 },
    ];

    vi.mocked(useTokens).mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useTokensWithSpreads(), { wrapper: createWrapper() });

    expect(result.current.data).toEqual(mockTokens);
    expect(result.current.loadedCount).toBe(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle loading state', () => {
    vi.mocked(useTokens).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useTokensWithSpreads(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.loadedCount).toBe(0);
  });

  it('should handle error state', () => {
    const error = new Error('Failed to fetch');
    
    vi.mocked(useTokens).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      isSuccess: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useTokensWithSpreads(), { wrapper: createWrapper() });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toEqual([]);
  });

  it('should expose refetch function', () => {
    const mockRefetch = vi.fn();
    
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isFetching: false,
      refetch: mockRefetch,
    } as never);

    const { result } = renderHook(() => useTokensWithSpreads(), { wrapper: createWrapper() });

    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('should handle empty tokens', () => {
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useTokensWithSpreads(), { wrapper: createWrapper() });

    expect(result.current.data).toEqual([]);
    expect(result.current.loadedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
  });
});
