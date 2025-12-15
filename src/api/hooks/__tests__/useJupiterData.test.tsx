import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    expect(getJupiterPrice).toHaveBeenCalledWith('BTC', undefined);
  });

  it('should not fetch when symbol is null', () => {
    const { result } = renderHook(() => useJupiterData(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getJupiterPrice).not.toHaveBeenCalled();
  });
});
