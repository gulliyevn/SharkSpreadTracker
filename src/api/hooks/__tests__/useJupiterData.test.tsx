import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мок для requestDeduplicator
vi.mock('@/utils/request-deduplication', () => ({
  requestDeduplicator: {
    deduplicate: vi.fn((_key, fn) => fn()),
  },
  createDeduplicationKey: vi.fn((endpoint, params) => {
    const sortedParams = params
      ? Object.keys(params)
          .sort()
          .map((key) => `${key}=${JSON.stringify(params[key])}`)
          .join('&')
      : '';
    return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
  }),
}));
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJupiterData } from '../useJupiterData';
import { getJupiterPrice } from '../../endpoints/prices.api';

vi.mock('../../endpoints/prices.api', () => ({
  getJupiterPrice: vi.fn(),
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

describe('useJupiterData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch Jupiter price when symbol is provided', async () => {
    const mockPrice = {
      price: 100,
      timestamp: Date.now(),
      source: 'jupiter' as const,
    };

    vi.mocked(getJupiterPrice).mockResolvedValue(mockPrice);

    const { result } = renderHook(() => useJupiterData('BTC'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPrice);
    expect(getJupiterPrice).toHaveBeenCalled();
    // Проверяем что функция вызвана с правильными аргументами (signal передается автоматически React Query)
    const calls = vi.mocked(getJupiterPrice).mock.calls;
    expect(calls[0]?.[0]).toBe('BTC');
    expect(calls[0]?.[1]).toBeUndefined();
  });

  it('should not fetch when symbol is null', () => {
    const { result } = renderHook(() => useJupiterData(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getJupiterPrice).not.toHaveBeenCalled();
  });
});
