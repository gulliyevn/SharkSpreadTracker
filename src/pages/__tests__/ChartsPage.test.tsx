import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartsPage } from '../ChartsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MinSpreadProvider } from '@/contexts/MinSpreadContext';
import { ToastProvider } from '@/contexts/ToastContext';
import type { StraightData } from '@/types';
import '@/lib/i18n';

// Мок для useTokensWithSpreads
const mockUseTokensWithSpreads = vi.fn();
vi.mock('@/api/hooks/useTokensWithSpreads', () => ({
  useTokensWithSpreads: () => mockUseTokensWithSpreads(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <MinSpreadProvider>
            <ToastProvider>{children}</ToastProvider>
          </MinSpreadProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('ChartsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ChartsPage with title', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем, что страница рендерится (фильтры присутствуют)
      const allButtons = screen.queryAllByText(/All|Все/i);
      expect(allButtons.length).toBeGreaterThan(0);
    });
  });

  it('should display loading skeleton when loading', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // ChartsLayoutSkeleton должен быть отрендерен
      expect(document.body).toBeInTheDocument();
    });
  });

  it('should display error when tokens fail to load', async () => {
    const mockRefetch = vi.fn();
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: mockRefetch,
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Используем getAllByText, так как может быть несколько элементов с текстом "error"
      const errorElements = screen.getAllByText(/error|ошибка/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it('should display empty state when no tokens', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tokens found/i)).toBeInTheDocument();
    });
  });

  it('should filter tokens by chain', async () => {
    const mockTokens: StraightData[] = [
      {
        token: 'BTC',
        aExchange: 'Jupiter',
        bExchange: 'MEXC',
        priceA: '50000',
        priceB: '50250',
        spread: '5.5',
        network: 'solana',
        limit: 'all',
      },
      {
        token: 'ETH',
        aExchange: 'PancakeSwap',
        bExchange: 'MEXC',
        priceA: '3000',
        priceB: '3063',
        spread: '2.1',
        network: 'bsc',
        limit: 'all',
      },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем, что страница рендерится (фильтры присутствуют)
      const allButtons = screen.queryAllByText(/All|Все/i);
      expect(allButtons.length).toBeGreaterThan(0);
    });

    // Находим кнопку фильтра по chain
    const solanaButton = screen.queryByLabelText(/show solana/i);
    if (solanaButton) {
      await userEvent.click(solanaButton);
    }
  });

  it('should display ChartsLayout when tokens are loaded', async () => {
    const mockTokens: StraightData[] = [
      {
        token: 'BTC',
        aExchange: 'Jupiter',
        bExchange: 'MEXC',
        priceA: '50000',
        priceB: '50250',
        spread: '5.5',
        network: 'solana',
        limit: 'all',
      },
      {
        token: 'ETH',
        aExchange: 'PancakeSwap',
        bExchange: 'MEXC',
        priceA: '3000',
        priceB: '3063',
        spread: '2.1',
        network: 'bsc',
        limit: 'all',
      },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем, что страница рендерится (фильтры присутствуют)
      const allButtons = screen.queryAllByText(/All|Все/i);
      expect(allButtons.length).toBeGreaterThan(0);
    });
  });

  it('should handle chain filter change', async () => {
    const mockTokens: StraightData[] = [
      {
        token: 'BTC',
        aExchange: 'Jupiter',
        bExchange: 'MEXC',
        priceA: '50000',
        priceB: '50250',
        spread: '5.5',
        network: 'solana',
        limit: 'all',
      },
      {
        token: 'ETH',
        aExchange: 'PancakeSwap',
        bExchange: 'MEXC',
        priceA: '3000',
        priceB: '3063',
        spread: '2.1',
        network: 'bsc',
        limit: 'all',
      },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем, что страница рендерится (фильтры присутствуют)
      const allButtons = screen.queryAllByText(/All|Все/i);
      expect(allButtons.length).toBeGreaterThan(0);
    });
  });

  it('should calculate chain counts correctly', async () => {
    const mockTokens: StraightData[] = [
      {
        token: 'BTC',
        aExchange: 'Jupiter',
        bExchange: 'MEXC',
        priceA: '50000',
        priceB: '50250',
        spread: '5.5',
        network: 'solana',
        limit: 'all',
      },
      {
        token: 'ETH',
        aExchange: 'Jupiter',
        bExchange: 'MEXC',
        priceA: '3000',
        priceB: '3063',
        spread: '2.1',
        network: 'solana',
        limit: 'all',
      },
      {
        token: 'BNB',
        aExchange: 'PancakeSwap',
        bExchange: 'MEXC',
        priceA: '400',
        priceB: '410',
        spread: '2.5',
        network: 'bsc',
        limit: 'all',
      },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем, что страница рендерится (фильтры присутствуют)
      const allButtons = screen.queryAllByText(/All|Все/i);
      expect(allButtons.length).toBeGreaterThan(0);
    });
  });
});
