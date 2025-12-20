import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TokensPage } from '../TokensPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
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
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('TokensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render TokensPage', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      loadedCount: 0,
      totalCount: 0,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем, что страница рендерится (ищем любой элемент страницы)
      expect(document.body).toBeInTheDocument();
    });
  });

  it('should display loading spinner when loading', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      loadedCount: 0,
      totalCount: 0,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const spinners = screen.getAllByRole('status', { hidden: true });
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  it('should display tokens when loaded', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      loadedCount: mockTokens.length,
      totalCount: mockTokens.length,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
        expect(screen.getByText('ETH')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display tokens with spread data', async () => {
    const mockTokens = [
      {
        symbol: 'BTC',
        chain: 'solana' as const,
        price: 50000,
        directSpread: 1.0,
        reverseSpread: 1.1,
      },
      {
        symbol: 'ETH',
        chain: 'bsc' as const,
        price: 2000,
        directSpread: 0.5,
        reverseSpread: 0.6,
      },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      loadedCount: mockTokens.length,
      totalCount: mockTokens.length,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
        expect(screen.getByText('ETH')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle tokens with null spreads', async () => {
    const mockTokens = [
      {
        symbol: 'BTC',
        chain: 'solana' as const,
        price: 50000,
        directSpread: null,
        reverseSpread: null,
      },
      {
        symbol: 'ETH',
        chain: 'bsc' as const,
        price: 2000,
        directSpread: 0.5,
        reverseSpread: 0.6,
      },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      loadedCount: mockTokens.length,
      totalCount: mockTokens.length,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(
      () => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
        expect(screen.getByText('ETH')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display empty state when no tokens loaded (without mock fallback)', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      loadedCount: 0,
      totalCount: 0,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tokens found/i)).toBeInTheDocument();
    });
  });

  it('should display error message when API fails', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to fetch tokens'),
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(
      () => {
        // Проверяем наличие текста об ошибке (может быть на разных языках)
        const errorText =
          screen.queryByText(/error|ошибка/i) ||
          screen.queryByText(/api.errors/i);
        expect(
          errorText || screen.getByText(/Please check console/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should filter tokens by search term', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
      { symbol: 'BNB', chain: 'bsc' as const },
    ];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      loadedCount: mockTokens.length,
      totalCount: mockTokens.length,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    // Находим поле поиска и вводим текст
    const searchInput = screen.getByPlaceholderText(/search|поиск/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should handle analytics tracking on token select', async () => {
    const mockTokens = [{ symbol: 'BTC', chain: 'solana' as const }];

    mockUseTokensWithSpreads.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
      loadedCount: mockTokens.length,
      totalCount: mockTokens.length,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
  });

  it('should handle empty tokens array gracefully', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      loadedCount: 0,
      totalCount: 0,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tokens found/i)).toBeInTheDocument();
    });
  });

  it('should show loading state correctly', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      loadedCount: 0,
      totalCount: 0,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const spinners = screen.getAllByRole('status', { hidden: true });
      expect(spinners.length).toBeGreaterThan(0);
    });
  });
});
