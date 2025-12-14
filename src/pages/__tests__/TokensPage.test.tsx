import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TokensPage } from '../TokensPage';
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

describe('TokensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render TokensPage', async () => {
    mockUseTokens.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const page = screen.getByRole('main') || document.body;
      expect(page).toBeInTheDocument();
    });
  });

  it('should display loading spinner when loading', async () => {
    mockUseTokens.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
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

    mockUseTokens.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <TokensPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

