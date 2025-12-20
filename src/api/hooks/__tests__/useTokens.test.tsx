import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTokens } from '../useTokens';
import { getAllTokens } from '../../endpoints/tokens.api';

vi.mock('../../endpoints/tokens.api', () => ({
  getAllTokens: vi.fn(),
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

describe('useTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch tokens successfully', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    vi.mocked(getAllTokens).mockResolvedValue(mockTokens);

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTokens);
    expect(getAllTokens).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    vi.mocked(getAllTokens).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should pass AbortSignal to getAllTokens', async () => {
    const mockTokens: never[] = [];
    vi.mocked(getAllTokens).mockResolvedValue(mockTokens);

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    const calls = vi.mocked(getAllTokens).mock.calls;
    expect(calls[0]?.[0]).toBeInstanceOf(AbortSignal);
  });
});
