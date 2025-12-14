import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePancakeData } from '../usePancakeData';
import { getPancakePrice } from '../../endpoints/prices.api';

vi.mock('../../endpoints/prices.api', () => ({
  getPancakePrice: vi.fn(),
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

describe('usePancakeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch PancakeSwap price when symbol is provided', async () => {
    const mockPrice = {
      price: 2000,
      timestamp: Date.now(),
      source: 'pancakeswap' as const,
    };

    vi.mocked(getPancakePrice).mockResolvedValue(mockPrice);

    const { result } = renderHook(() => usePancakeData('ETH'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPrice);
    expect(getPancakePrice).toHaveBeenCalledWith('ETH');
  });

  it('should not fetch when symbol is null', () => {
    const { result } = renderHook(() => usePancakeData(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(getPancakePrice).not.toHaveBeenCalled();
  });
});

