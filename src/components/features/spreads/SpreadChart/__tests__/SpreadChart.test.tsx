import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { SpreadChart } from '../SpreadChart';
import type { SpreadResponse } from '@/types';

// Мокируем echarts-for-react
vi.mock('echarts-for-react', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="echarts-chart" data-option={JSON.stringify(option)}>
      <div data-testid="echarts-inner" />
    </div>
  ),
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
          timeframe="1h"
          isLoading={true}
        />
      </TestWrapper>
    );

    // В loading состоянии должен быть LoadingSpinner
    // Проверяем что компонент рендерится (Card должен быть)
    expect(container.querySelector('.h-\\[450px\\]')).toBeInTheDocument();
  });

  it('should display message when sources are not selected', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={null}
          source1={null}
          source2={null}
          timeframe="1h"
          isLoading={false}
        />
      </TestWrapper>
    );

    // Проверяем что отображается сообщение о необходимости выбора источников
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
          timeframe="1h"
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
          timeframe="1h"
          isLoading={false}
        />
      </TestWrapper>
    );

    // Проверяем что график рендерится
    expect(screen.getByTestId('echarts-chart')).toBeInTheDocument();
  });

  it('should render chart with data points', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={mockSpreadData}
          source1="jupiter"
          source2="mexc"
          timeframe="1h"
          isLoading={false}
        />
      </TestWrapper>
    );

    // Проверяем что график рендерится с данными
    const chart = screen.getByTestId('echarts-chart');
    expect(chart).toBeInTheDocument();

    // Проверяем что опции графика содержат серии данных
    const option = chart.getAttribute('data-option');
    expect(option).toBeTruthy();
    if (option) {
      const parsedOption = JSON.parse(option);
      expect(parsedOption.series).toBeDefined();
      expect(Array.isArray(parsedOption.series)).toBe(true);
      expect(parsedOption.series.length).toBeGreaterThan(0);
    }
  });

  it('should render chart components', () => {
    render(
      <TestWrapper>
        <SpreadChart
          spreadData={mockSpreadData}
          source1="jupiter"
          source2="mexc"
          timeframe="1h"
          isLoading={false}
        />
      </TestWrapper>
    );

    // Проверяем что график рендерится
    const chart = screen.getByTestId('echarts-chart');
    expect(chart).toBeInTheDocument();

    // Проверяем что опции графика переданы
    const option = chart.getAttribute('data-option');
    expect(option).toBeTruthy();
    if (option) {
      const parsedOption = JSON.parse(option);
      expect(parsedOption).toHaveProperty('xAxis');
      expect(parsedOption).toHaveProperty('yAxis');
      expect(parsedOption).toHaveProperty('series');
    }
  });
});
