import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTokens } from '../useTokens';
import type { ReactNode } from 'react';

// Мокаем api-adapter
vi.mock('../../adapters/api-adapter', () => ({
  getAllTokens: vi.fn(),
}));

import { getAllTokens } from '../../adapters/api-adapter';

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

describe('useTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch tokens on mount', async () => {
    const mockTokens = [
      {
        symbol: 'BTC',
        chain: 'solana' as const,
        price: 50000,
        directSpread: 0.5,
      },
      { symbol: 'ETH', chain: 'bsc' as const, price: 3000, directSpread: 0.3 },
    ];

    vi.mocked(getAllTokens).mockResolvedValue(mockTokens);

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTokens);
    expect(getAllTokens).toHaveBeenCalledTimes(1);
  });

  it('should handle loading state', async () => {
    vi.mocked(getAllTokens).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle error state', async () => {
    vi.mocked(getAllTokens).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeDefined();
  });

  it('should return empty array when API returns empty', async () => {
    vi.mocked(getAllTokens).mockResolvedValue([]);

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should pass AbortSignal to getAllTokens', async () => {
    vi.mocked(getAllTokens).mockResolvedValue([]);

    renderHook(() => useTokens(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getAllTokens).toHaveBeenCalled();
    });

    // Проверяем что был передан signal
    const calls = vi.mocked(getAllTokens).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]).toBeInstanceOf(AbortSignal);
  });
});
