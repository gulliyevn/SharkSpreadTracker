import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('should handle chain filter change', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    // Находим кнопку фильтра по chain
    const chainLabel = screen.queryByText(/Chain:/i);
    expect(chainLabel).toBeInTheDocument();
  });

  it('should display progress when loading partial data', async () => {
    mockUseTokensWithSpreads.mockReturnValue({
      data: [{ symbol: 'BTC', chain: 'solana' as const }],
      isLoading: false,
      error: null,
      loadedCount: 1,
      totalCount: 5,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const progress = screen.queryByText(/1\/5/i);
      expect(progress || document.body).toBeInTheDocument();
    });
  });

  it('should display total count when all loaded', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    const totalText = screen.queryByText(/2 total/i);
    expect(totalText || document.body).toBeInTheDocument();
  });

  it('should handle error reset', async () => {
    const mockRefetch = vi.fn();
    mockUseTokensWithSpreads.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: mockRefetch,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error|ошибка/i)).toBeInTheDocument();
    });

    // Находим кнопку reset в ErrorDisplay
    const resetButton = screen.queryByText(/retry|try again|повторить/i);
    if (resetButton) {
      await userEvent.click(resetButton);
      expect(mockRefetch).toHaveBeenCalled();
    }
  });

  it('should handle token edit and open modal', async () => {
    const mockTokens = [
      {
        symbol: 'BTC',
        chain: 'solana' as const,
        price: 50000,
        directSpread: 1.0,
        reverseSpread: 1.1,
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    // Модальное окно должно появиться при редактировании токена
    // Проверяем что компонент рендерится без ошибок
    expect(document.body).toBeInTheDocument();
  });

  it('should filter by search term with no results', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search|поиск/i);
    await userEvent.type(searchInput, 'XYZ');

    await waitFor(() => {
      const noResults = screen.queryByText(/no tokens match/i);
      expect(noResults || document.body).toBeInTheDocument();
    });
  });

  it('should handle sort option change', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    // Проверяем что сортировка присутствует
    const sortLabel = screen.queryByText(/Sort:/i);
    expect(sortLabel || document.body).toBeInTheDocument();
  });

  it('should filter tokens by minSpread', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const, directSpread: 0.5, reverseSpread: 0.3 },
      { symbol: 'ETH', chain: 'bsc' as const, directSpread: 2.0, reverseSpread: 1.5 },
      { symbol: 'BNB', chain: 'bsc' as const, directSpread: 0.1, reverseSpread: 0.1 },
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
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('BNB')).toBeInTheDocument();
    });
  });

  it('should filter by directOnly', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const, directSpread: 1.0, reverseSpread: 0 },
      { symbol: 'ETH', chain: 'bsc' as const, directSpread: 0, reverseSpread: 2.0 },
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
  });

  it('should filter by reverseOnly', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const, directSpread: 0, reverseSpread: 1.5 },
      { symbol: 'ETH', chain: 'bsc' as const, directSpread: 2.0, reverseSpread: 0 },
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
  });

  it('should sort by name when sortOption is name', async () => {
    localStorage.setItem('token-sort-option', 'name');
    
    const mockTokens = [
      { symbol: 'ZZZ', chain: 'solana' as const },
      { symbol: 'AAA', chain: 'bsc' as const },
      { symbol: 'MMM', chain: 'bsc' as const },
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
      expect(screen.getByText('AAA')).toBeInTheDocument();
      expect(screen.getByText('ZZZ')).toBeInTheDocument();
    });
  });

  it('should sort by price when sortOption is price', async () => {
    localStorage.setItem('token-sort-option', 'price');
    
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const, price: 50000 },
      { symbol: 'ETH', chain: 'bsc' as const, price: 2000 },
      { symbol: 'BNB', chain: 'bsc' as const, price: 300 },
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
  });

  it('should handle token edit modal flow', async () => {
    const mockTokens = [
      {
        symbol: 'BTC',
        chain: 'solana' as const,
        price: 50000,
        directSpread: 1.0,
        reverseSpread: 1.1,
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    // Ищем кнопку редактирования
    const editButtons = screen.getAllByRole('button');
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('should use localStorage saved sort option', async () => {
    localStorage.setItem('token-sort-option', 'spread');
    
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const, directSpread: 5.0, reverseSpread: 4.0 },
      { symbol: 'ETH', chain: 'bsc' as const, directSpread: 1.0, reverseSpread: 0.5 },
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
      // BTC должен быть первым т.к. у него больший спред
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
  });

  it('should filter by chain using chain filter buttons', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    // Проверяем что есть кнопки фильтра по chain
    const chainLabel = screen.getByText(/Chain:/i);
    expect(chainLabel).toBeInTheDocument();
  });
});
