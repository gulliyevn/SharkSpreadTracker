import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMexcData } from '../useMexcData';
import { getMexcPrice } from '../../endpoints/prices.api';

vi.mock('../../endpoints/prices.api', () => ({
  getMexcPrice: vi.fn(),
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

describe('useMexcData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch MEXC price when symbol is provided', async () => {
    const mockPrice = {
      price: 50000,
      bid: 49900,
      ask: 50100,
      timestamp: Date.now(),
      source: 'mexc' as const,
    };

    vi.mocked(getMexcPrice).mockResolvedValue(mockPrice);

    const { result } = renderHook(() => useMexcData('BTCUSDT'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPrice);
    expect(getMexcPrice).toHaveBeenCalled();
    // Проверяем что функция вызвана с правильными аргументами (signal передается автоматически React Query)
    const calls = vi.mocked(getMexcPrice).mock.calls;
    expect(calls[0]?.[0]).toBe('BTCUSDT');
  });

  it('should not fetch when symbol is null', () => {
    const { result } = renderHook(() => useMexcData(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getMexcPrice).not.toHaveBeenCalled();
  });
});
