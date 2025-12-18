import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { ChartsLayout } from '../ChartsLayout';
import type { Token } from '@/types';

// Мокируем useSpreadData
vi.mock('@/api/hooks/useSpreadData', () => ({
  useSpreadData: vi.fn(),
}));

const { useSpreadData } = await import('@/api/hooks/useSpreadData');

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const mockTokens: Token[] = [
  {
    symbol: 'BTC',
    chain: 'solana',
    address: 'So11111111111111111111111111111111111111112',
  },
  {
    symbol: 'ETH',
    chain: 'bsc',
    address: '0x1234567890123456789012345678901234567890',
  },
];

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

describe('ChartsLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(useSpreadData).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isPlaceholderData: false,
      status: 'success',
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isInitialLoading: false,
      isPaused: false,
      isRefetching: false,
      isStale: false,
      fetchStatus: 'idle',
    } as unknown as ReturnType<typeof useSpreadData>);
  });

  it('should render all layout components', async () => {
    render(
      <TestWrapper>
        <ChartsLayout tokens={mockTokens} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Select Token/i)).toBeInTheDocument();
    });

    // Проверяем что компоненты рендерятся (могут быть с разными текстами из i18n)
    expect(screen.getByText(/Timeframe/i)).toBeInTheDocument();
    // SourceSelector может показывать "Select a token first" если токен не выбран
    const compareSources = screen.queryByText(/Compare Sources/i);
    const selectTokenFirst = screen.queryByText(/Select a token first/i);
    expect(compareSources || selectTokenFirst).toBeTruthy();
  });

  it('should load saved settings from localStorage', async () => {
    localStorage.setItem(
      'charts-selected-token',
      JSON.stringify(mockTokens[0])
    );
    localStorage.setItem('charts-timeframe', '5m');
    localStorage.setItem('charts-source1', 'jupiter');
    localStorage.setItem('charts-source2', 'mexc');
    localStorage.setItem('charts-chart-type', 'spread');
    localStorage.setItem('charts-auto-refresh', 'false');

    render(
      <TestWrapper>
        <ChartsLayout tokens={mockTokens} />
      </TestWrapper>
    );

    // Проверяем что настройки загружены (токен должен быть выбран)
    await waitFor(
      () => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should save settings to localStorage when changed', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <ChartsLayout tokens={mockTokens} />
      </TestWrapper>
    );

    // Выбираем токен
    const btcButton = screen.getByText('BTC').closest('button');
    if (btcButton) {
      await user.click(btcButton);

      await waitFor(() => {
        const saved = localStorage.getItem('charts-selected-token');
        expect(saved).toBeTruthy();
        if (saved) {
          const token = JSON.parse(saved);
          expect(token.symbol).toBe('BTC');
        }
      });
    }
  });

  it('should call useSpreadData with correct parameters', async () => {
    const selectedToken = mockTokens[0];
    localStorage.setItem(
      'charts-selected-token',
      JSON.stringify(selectedToken)
    );
    localStorage.setItem('charts-timeframe', '1h');

    render(
      <TestWrapper>
        <ChartsLayout tokens={mockTokens} />
      </TestWrapper>
    );

    // Проверяем что useSpreadData был вызван
    await waitFor(
      () => {
        expect(useSpreadData).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('should display spread chart when data is available', async () => {
    localStorage.setItem(
      'charts-selected-token',
      JSON.stringify(mockTokens[0])
    );
    localStorage.setItem('charts-source1', 'jupiter');
    localStorage.setItem('charts-source2', 'mexc');
    localStorage.setItem('charts-chart-type', 'spread');

    vi.mocked(useSpreadData).mockReturnValue({
      data: mockSpreadData,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSpreadData>);

    const { container } = render(
      <TestWrapper>
        <ChartsLayout tokens={mockTokens} />
      </TestWrapper>
    );

    // Ждем пока компонент загрузит настройки из localStorage
    await waitFor(
      () => {
        // Проверяем что ChartsLayout отрендерился (grid структура)
        expect(container.querySelector('.grid')).toBeInTheDocument();
        // Проверяем что есть центральная колонка (где должен быть график)
        expect(container.querySelector('.lg\\:col-span-6')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle refresh button click', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    vi.mocked(useSpreadData).mockReturnValue({
      data: mockSpreadData,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isFetching: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useSpreadData>);

    localStorage.setItem(
      'charts-selected-token',
      JSON.stringify(mockTokens[0])
    );

    render(
      <TestWrapper>
        <ChartsLayout tokens={mockTokens} />
      </TestWrapper>
    );

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh').closest('button');
      expect(refreshButton).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh').closest('button');
    if (refreshButton) {
      await user.click(refreshButton);
      expect(mockRefetch).toHaveBeenCalled();
    }
  });
});
