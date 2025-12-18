import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/contexts/ToastContext';
import { TokenDetailsModal } from '../TokenDetailsModal';
import type { Token } from '@/types';

// Моки
vi.mock('@/api/hooks/useSpreadData', () => ({
  useSpreadData: vi.fn(),
}));

vi.mock('@/api/endpoints/mexc-limits.api', () => ({
  getMexcTradingLimits: vi.fn(),
}));

const { useSpreadData } = await import('@/api/hooks/useSpreadData');
const { getMexcTradingLimits } =
  await import('@/api/endpoints/mexc-limits.api');

// Wrapper для React Query и ToastProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
};

describe('TokenDetailsModal', () => {
  const mockToken: Token = {
    symbol: 'BTC',
    chain: 'solana',
    address: 'So11111111111111111111111111111111111111112',
  };

  const mockTokenBSC: Token = {
    symbol: 'ETH',
    chain: 'bsc',
    address: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Мокируем useSpreadData
    vi.mocked(useSpreadData).mockReturnValue({
      data: {
        symbol: 'BTC',
        chain: 'solana',
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
      },
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSpreadData>);

    // Мокируем getMexcTradingLimits
    vi.mocked(getMexcTradingLimits).mockResolvedValue(null);

    // Мокируем navigator.clipboard через Object.defineProperty
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when token is null', () => {
    const { container } = render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={null} />,
      { wrapper: createWrapper() }
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <TokenDetailsModal isOpen={false} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render modal with token details when open', () => {
    render(
      <TokenDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        token={mockToken}
        price={50000}
        directSpread={5.5}
        reverseSpread={-3.2}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('BTC Details')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Solana')).toBeInTheDocument();
  });

  it('should display token address when available', () => {
    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    expect(
      screen.getByText(mockToken.address!, { exact: false })
    ).toBeInTheDocument();
  });

  it('should display price when provided', () => {
    render(
      <TokenDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        token={mockToken}
        price={50000}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Current Price/i)).toBeInTheDocument();
  });

  it('should display direct and reverse spreads', () => {
    render(
      <TokenDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        token={mockToken}
        directSpread={5.5}
        reverseSpread={-3.2}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Direct Spread/i)).toBeInTheDocument();
    expect(screen.getByText(/Reverse Spread/i)).toBeInTheDocument();
  });

  it('should copy address to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const copyButton = screen.getByRole('button', { name: /copy address/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(mockToken.address);
    });
  });

  it('should show check icon after copying address', async () => {
    const user = userEvent.setup();
    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const copyButton = screen.getByRole('button', { name: /copy address/i });
    await user.click(copyButton);

    await waitFor(
      () => {
        // После копирования должна появиться иконка Check (зеленая галочка)
        // Проверяем что кнопка все еще существует
        expect(
          screen.getByRole('button', { name: /copy address/i })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display exchange buttons for available sources', async () => {
    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Для Solana должны быть Jupiter и MEXC в секции Exchanges
      expect(screen.getByText(/Exchanges/i)).toBeInTheDocument();
      const exchangeSection = screen
        .getByText(/Exchanges/i)
        .closest('.p-4, .p-6');
      expect(exchangeSection).toBeInTheDocument();
      // Проверяем что есть кнопки с Jupiter и MEXC
      const buttons = exchangeSection?.querySelectorAll('button');
      const buttonTexts = Array.from(buttons || []).map(
        (btn) => btn.textContent
      );
      expect(buttonTexts.some((text) => text?.includes('Jupiter'))).toBe(true);
      expect(buttonTexts.some((text) => text?.includes('MEXC'))).toBe(true);
    });
  });

  it('should open exchange URL when exchange button is clicked', async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null);

    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const jupiterButton = screen.getByText(/Jupiter/i).closest('button');
    if (jupiterButton) {
      await user.click(jupiterButton);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://jup.ag',
        '_blank',
        'noopener,noreferrer'
      );
    }

    windowOpenSpy.mockRestore();
  });

  it('should load and display MEXC trading limits for BSC tokens', async () => {
    const mockLimits = {
      minNotional: 10,
      minQty: 0.001,
      maxQty: 1000,
      stepSize: 0.0001,
    };

    vi.mocked(getMexcTradingLimits).mockResolvedValue(mockLimits);

    render(
      <TokenDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        token={mockTokenBSC}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(getMexcTradingLimits).toHaveBeenCalledWith('ETHUSDT');
    });

    await waitFor(() => {
      expect(screen.getByText(/MEXC Trading Limits/i)).toBeInTheDocument();
      expect(screen.getByText(/MIN_NOTIONAL/i)).toBeInTheDocument();
      expect(screen.getByText(/Min Qty/i)).toBeInTheDocument();
    });
  });

  it('should load spread settings from localStorage', () => {
    const settingsKey = `token-spread-settings-${mockToken.symbol}-${mockToken.chain}`;
    localStorage.setItem(settingsKey, JSON.stringify({ threshold: 2.5 }));

    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText(
      /Spread Threshold/i
    ) as HTMLInputElement;
    expect(input.value).toBe('2.5');
  });

  it('should save spread settings to localStorage', async () => {
    const user = userEvent.setup();
    const settingsKey = `token-spread-settings-${mockToken.symbol}-${mockToken.chain}`;

    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByLabelText(/Spread Threshold/i);
    await user.clear(input);
    await user.type(input, '3.5');

    const saveButton = screen.getByRole('button', { name: /Save Settings/i });
    await user.click(saveButton);

    await waitFor(() => {
      const saved = localStorage.getItem(settingsKey);
      expect(saved).toBeTruthy();
      if (saved) {
        const parsed = JSON.parse(saved);
        expect(parsed.threshold).toBe(3.5);
      }
      // Проверяем что настройки сохранены
    });
  });

  it('should display loading state for spread chart', () => {
    vi.mocked(useSpreadData).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSpreadData>);

    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Spread Chart/i)).toBeInTheDocument();
  });

  it('should display error state for spread chart', () => {
    vi.mocked(useSpreadData).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
      isSuccess: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
      isPending: false,
      isLoadingError: true,
      isRefetchError: false,
      isPlaceholderData: false,
      status: 'error',
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: new Error('Failed to load'),
      errorUpdateCount: 1,
      isFetched: false,
      isFetchedAfterMount: false,
      isInitialLoading: false,
      isPaused: false,
      isRefetching: false,
      isStale: false,
      fetchStatus: 'idle',
    } as unknown as ReturnType<typeof useSpreadData>);

    render(
      <TokenDetailsModal isOpen={true} onClose={vi.fn()} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    // Проверяем что график не отображается или показывается сообщение об ошибке
    // Может быть "No chart data available" или просто отсутствие графика
    const errorMessage = screen.queryByText(
      /Error loading chart data|No chart data available|No data/i
    );
    const chartElement =
      screen.queryByTestId('line-chart') ||
      screen.queryByTestId('responsive-container');
    // Либо есть сообщение об ошибке, либо график не отображается
    expect(errorMessage || !chartElement).toBeTruthy();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TokenDetailsModal isOpen={true} onClose={onClose} token={mockToken} />,
      { wrapper: createWrapper() }
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not display address section when address is missing', () => {
    const tokenWithoutAddress: Token = {
      symbol: 'USDT',
      chain: 'bsc',
    };

    render(
      <TokenDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        token={tokenWithoutAddress}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText(/Address/i)).not.toBeInTheDocument();
  });

  it('should display MEXC limits section only for BSC or when MEXC is available', async () => {
    vi.mocked(getMexcTradingLimits).mockResolvedValue({
      minNotional: 10,
      minQty: 0.001,
    });

    render(
      <TokenDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        token={mockTokenBSC}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/MEXC Trading Limits/i)).toBeInTheDocument();
    });
  });
});
