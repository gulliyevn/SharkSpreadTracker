import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { TokenCard } from '../TokenCard';
import type { Token } from '@/types';

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

const mockToken: Token = {
  symbol: 'BTC',
  chain: 'solana',
};

describe('TokenCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render token symbol', () => {
    render(<TokenCard token={mockToken} />, { wrapper: TestWrapper });
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should display price', () => {
    render(<TokenCard token={mockToken} price={50000} />, {
      wrapper: TestWrapper,
    });
    expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
  });

  it('should display "—" for null price', () => {
    render(<TokenCard token={mockToken} price={null} />, {
      wrapper: TestWrapper,
    });
    // PriceDisplay использует "—" для null значений
    // Может быть несколько элементов с "—", используем getAllByText
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should display direct spread', () => {
    render(<TokenCard token={mockToken} directSpread={5.5} />, {
      wrapper: TestWrapper,
    });
    expect(screen.getByText('+5.50%')).toBeInTheDocument();
  });

  it('should display reverse spread', () => {
    render(<TokenCard token={mockToken} reverseSpread={-3.2} />, {
      wrapper: TestWrapper,
    });
    expect(screen.getByText('-3.20%')).toBeInTheDocument();
  });

  it('should call onFavoriteToggle when favorite button is clicked', async () => {
    const user = userEvent.setup();
    const onFavoriteToggle = vi.fn();

    render(
      <TokenCard token={mockToken} onFavoriteToggle={onFavoriteToggle} />,
      { wrapper: TestWrapper }
    );

    const favoriteButton = screen.getByRole('button', {
      name: /add to favorites|remove from favorites/i,
    });
    await user.click(favoriteButton);

    expect(onFavoriteToggle).toHaveBeenCalledWith(mockToken);
  });

  it('should show filled star when isFavorite is true', () => {
    render(<TokenCard token={mockToken} isFavorite={true} />, {
      wrapper: TestWrapper,
    });
    const favoriteButton = screen.getByRole('button', {
      name: /remove from favorites/i,
    });
    expect(favoriteButton).toBeInTheDocument();
  });
});
