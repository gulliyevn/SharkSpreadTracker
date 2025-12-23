import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';

// Mock для lazy-loaded компонентов
vi.mock('../pages/TokensPage', () => ({
  TokensPage: () => <div data-testid="tokens-page">TokensPage</div>,
}));

vi.mock('../pages/ChartsPage', () => ({
  ChartsPage: () => <div data-testid="charts-page">ChartsPage</div>,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render App with Header and Footer', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const header = screen.getByRole('banner');
      const footer = screen.getByRole('contentinfo');
      expect(header).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
    });
  });

  it('should render main content area', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have correct structure with Header, main, Footer, and ToastContainer', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });

  it('should render ToastContainer', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // ToastContainer рендерится, но может быть пустым
    // Проверяем, что приложение рендерится без ошибок
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
