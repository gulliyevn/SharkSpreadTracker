import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { SpreadChart } from '../SpreadChart';
import type { SpreadResponse } from '@/types';

// Мокируем recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: () => <div data-testid="reference-line" />,
  Brush: () => <div data-testid="brush" />,
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

const mockSpreadData: SpreadResponse = {
  symbol: 'BTC',
  chain: 'solana',
  history: [
    {
      timestamp: Date.now() - 3600000,
      mexc_price: 50000,
      jupiter_price: 50100,
      pancakeswap_price: null,
    },
    {
      timestamp: Date.now() - 1800000,
      mexc_price: 50100,
      jupiter_price: 50200,
      pancakeswap_price: null,
    },
    {
      timestamp: Date.now(),
      mexc_price: 50200,
      jupiter_price: 50300,
      pancakeswap_price: null,
    },
  ],
  current: {
    timestamp: Date.now(),
    mexc_price: 50200,
    jupiter_price: 50300,
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

describe('SpreadChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state', () => {
    const { container } = render(
      <TestWrapper>
        <SpreadChart
          spreadData={null}
          source1={null}
          source2={null}
          isLoading={true}
        />
      </TestWrapper>
    );

    // В loading состоянии должен быть LoadingSpinner
    // Проверяем что компонент рендерится (Card должен быть)
    expect(container.querySelector('.h-\\[400px\\]')).toBeInTheDocument();
  });

  it('should display message when sources are not selected', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={mockSpreadData}
          source1={null}
          source2={null}
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(
      screen.getByText(/Select sources to display chart/i)
    ).toBeInTheDocument();
  });

  it('should display message when no chart data is available', () => {
    const emptySpreadData: SpreadResponse = {
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
        <SpreadChart
          spreadData={emptySpreadData}
          source1="jupiter"
          source2="mexc"
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/No chart data available/i)).toBeInTheDocument();
  });

  it('should render chart when data and sources are provided', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={mockSpreadData}
          source1="jupiter"
          source2="mexc"
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Spread Chart/i)).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should display data points count', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={mockSpreadData}
          source1="jupiter"
          source2="mexc"
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/3 data points/i)).toBeInTheDocument();
  });

  it('should render chart components', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={mockSpreadData}
          source1="jupiter"
          source2="mexc"
          isLoading={false}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
    expect(screen.getByTestId('brush')).toBeInTheDocument();
  });
});
