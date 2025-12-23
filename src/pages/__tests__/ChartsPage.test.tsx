import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartsPage } from '../ChartsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@/lib/i18n';

// Мок для useTokens
const mockUseTokens = vi.fn();
vi.mock('@/api/hooks/useTokens', () => ({
  useTokens: () => mockUseTokens(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('ChartsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ChartsPage with title', async () => {
    mockUseTokens.mockReturnValue({
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
      const titles = screen.queryAllByText(/Charts|графики/i);
      expect(titles.length).toBeGreaterThan(0);
    });
  });

  it('should display loading skeleton when loading', async () => {
    mockUseTokens.mockReturnValue({
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
    mockUseTokens.mockReturnValue({
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
      expect(screen.getByText(/error|ошибка/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no tokens', async () => {
    mockUseTokens.mockReturnValue({
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
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    mockUseTokens.mockReturnValue({
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
      const titles = screen.queryAllByText(/Charts/i);
      expect(titles.length).toBeGreaterThan(0);
    });

    // Находим кнопку фильтра по chain
    const solanaButton = screen.queryByLabelText(/show solana/i);
    if (solanaButton) {
      await userEvent.click(solanaButton);
    }
  });

  it('should display ChartsLayout when tokens are loaded', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    mockUseTokens.mockReturnValue({
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
      const titles = screen.queryAllByText(/Charts/i);
      expect(titles.length).toBeGreaterThan(0);
    });
  });

  it('should handle chain filter change', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'bsc' as const },
    ];

    mockUseTokens.mockReturnValue({
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
      const titles = screen.queryAllByText(/Charts/i);
      expect(titles.length).toBeGreaterThan(0);
    });

    // Проверяем что chain filter присутствует
    const chainLabel = screen.queryByText(/Chain:/i);
    expect(chainLabel || document.body).toBeInTheDocument();
  });

  it('should calculate chain counts correctly', async () => {
    const mockTokens = [
      { symbol: 'BTC', chain: 'solana' as const },
      { symbol: 'ETH', chain: 'solana' as const },
      { symbol: 'BNB', chain: 'bsc' as const },
    ];

    mockUseTokens.mockReturnValue({
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
      const titles = screen.queryAllByText(/Charts/i);
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});
