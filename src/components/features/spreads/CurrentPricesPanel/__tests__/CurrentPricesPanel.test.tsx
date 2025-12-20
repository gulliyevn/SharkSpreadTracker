import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { CurrentPricesPanel } from '../CurrentPricesPanel';
import type { Token, SpreadResponse } from '@/types';

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

const mockSpreadData: SpreadResponse = {
  symbol: 'BTC',
  chain: 'solana',
  history: [],
  current: {
    timestamp: Date.now(),
    mexc_price: 50000,
    jupiter_price: 50100,
    pancakeswap_price: null,
    mexc_bid: 49950,
    mexc_ask: 50050,
  },
  sources: {
    mexc: true,
    jupiter: true,
    pancakeswap: false,
  },
};

describe('CurrentPricesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display message when token is not selected', () => {
    render(
      <TestWrapper>
        <CurrentPricesPanel token={null} spreadData={null} />
      </TestWrapper>
    );

    expect(
      screen.getByText(/Select a token to view prices/i)
    ).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(
      <TestWrapper>
        <CurrentPricesPanel
          token={mockToken}
          spreadData={null}
          isLoading={true}
        />
      </TestWrapper>
    );

    // Проверяем что отображается skeleton (CurrentPricesPanelSkeleton)
    expect(screen.getByTestId('current-prices-panel-skeleton')).toBeInTheDocument();
  });

  it('should display prices for all available sources', () => {
    render(
      <TestWrapper>
        <CurrentPricesPanel token={mockToken} spreadData={mockSpreadData} />
      </TestWrapper>
    );

    expect(screen.getByText(/Current Prices - BTC/i)).toBeInTheDocument();
    expect(screen.getByText(/MEXC/i)).toBeInTheDocument();
    expect(screen.getByText(/Jupiter/i)).toBeInTheDocument();
  });

  it('should display MEXC bid and ask prices', () => {
    render(
      <TestWrapper>
        <CurrentPricesPanel token={mockToken} spreadData={mockSpreadData} />
      </TestWrapper>
    );

    expect(screen.getByText(/Bid:/i)).toBeInTheDocument();
    expect(screen.getByText(/Ask:/i)).toBeInTheDocument();
  });

  it('should display message when no price data is available', () => {
    const emptySpreadData: SpreadResponse = {
      symbol: 'BTC',
      chain: 'solana',
      history: [],
      current: null,
      sources: {
        mexc: false,
        jupiter: false,
        pancakeswap: false,
      },
    };

    render(
      <TestWrapper>
        <CurrentPricesPanel token={mockToken} spreadData={emptySpreadData} />
      </TestWrapper>
    );

    expect(
      screen.getByText(/No current price data available/i)
    ).toBeInTheDocument();
  });

  it('should handle null prices gracefully', () => {
    const spreadDataWithNulls: SpreadResponse = {
      symbol: 'BTC',
      chain: 'solana',
      history: [],
      current: {
        timestamp: Date.now(),
        mexc_price: null,
        jupiter_price: null,
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

    render(
      <TestWrapper>
        <CurrentPricesPanel
          token={mockToken}
          spreadData={spreadDataWithNulls}
        />
      </TestWrapper>
    );

    // Проверяем что отображается сообщение о недоступности цены
    const priceNotAvailable = screen.getAllByText(/Price not available/i);
    expect(priceNotAvailable.length).toBeGreaterThan(0);
  });
});
