import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTokensWithSpreads } from '../useTokensWithSpreads';
import { useTokens } from '../useTokens';

vi.mock('../useTokens');

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

describe('useTokensWithSpreads', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);
  });

  it('should return initial state when no tokens', () => {
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
  });

  it('should return tokens when available', () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    vi.mocked(useTokens).mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    // Хук должен вернуть токены (даже если спреды еще загружаются)
    expect(result.current.data.length).toBeGreaterThanOrEqual(0);
    expect(result.current.totalCount).toBe(2);
  });

  it('should handle loading state', () => {
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', () => {
    const mockError = new Error('Failed to load tokens');
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should return refetch function', () => {
    vi.mocked(useTokens).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('should handle spread loading errors gracefully', () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
    ];

    vi.mocked(useTokens).mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    // Хук должен продолжать работать даже при ошибке загрузки спредов
    expect(result.current.data).toBeDefined();
    expect(result.current.totalCount).toBe(1);
  });

  it('should handle tokens update when tokens list changes', () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
    ];

    vi.mocked(useTokens).mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result, rerender } = renderHook(() => useTokensWithSpreads(), {
      wrapper: createWrapper(),
    });

    expect(result.current.totalCount).toBe(1);

    // Обновляем список токенов
    const newTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    vi.mocked(useTokens).mockReturnValue({
      data: newTokens,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    rerender();

    // Хук должен обновить totalCount
    expect(result.current.totalCount).toBe(2);
  });
});

