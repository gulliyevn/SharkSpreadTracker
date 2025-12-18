import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { SpreadAnalysisPanel } from '../SpreadAnalysisPanel';
import type { SpreadResponse } from '@/types';

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

const mockSpreadData: SpreadResponse = {
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
};

describe('SpreadAnalysisPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display message when sources are not selected', () => {
    render(
      <TestWrapper>
        <SpreadAnalysisPanel source1={null} source2={null} spreadData={null} />
      </TestWrapper>
    );

    expect(screen.getByText(/Select sources to compare/i)).toBeInTheDocument();
  });

  it('should display spread analysis when sources and data are provided', () => {
    render(
      <TestWrapper>
        <SpreadAnalysisPanel
          source1="jupiter"
          source2="mexc"
          spreadData={mockSpreadData}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Spread Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Spread/i)).toBeInTheDocument();
    expect(screen.getByText(/Reverse Spread/i)).toBeInTheDocument();
  });

  it('should display action hints', () => {
    render(
      <TestWrapper>
        <SpreadAnalysisPanel
          source1="jupiter"
          source2="mexc"
          spreadData={mockSpreadData}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Buy on Jupiter/i)).toBeInTheDocument();
    expect(screen.getByText(/sell on MEXC/i)).toBeInTheDocument();
  });

  it('should display message when current data is null', () => {
    const spreadDataWithoutCurrent: SpreadResponse = {
      symbol: 'BTC',
      chain: 'solana',
      history: [],
      current: null,
      sources: {
        mexc: true,
        jupiter: true,
        pancakeswap: false,
      },
    };

    render(
      <TestWrapper>
        <SpreadAnalysisPanel
          source1="jupiter"
          source2="mexc"
          spreadData={spreadDataWithoutCurrent}
        />
      </TestWrapper>
    );

    expect(
      screen.getByText(/No current price data available/i)
    ).toBeInTheDocument();
  });

  it('should calculate and display positive spread correctly', () => {
    const positiveSpreadData: SpreadResponse = {
      symbol: 'BTC',
      chain: 'solana',
      history: [],
      current: {
        timestamp: Date.now(),
        mexc_price: 50000,
        jupiter_price: 51000, // Выше, значит положительный спред
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
        <SpreadAnalysisPanel
          source1="jupiter"
          source2="mexc"
          spreadData={positiveSpreadData}
        />
      </TestWrapper>
    );

    // Должен быть положительный спред (51000 - 50000) / 50000 * 100 = 2%
    const spreadElements = screen.getAllByText(/\+.*%/);
    expect(spreadElements.length).toBeGreaterThan(0);
  });
});
