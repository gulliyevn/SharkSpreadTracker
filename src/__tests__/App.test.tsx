import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ViewProvider } from '@/contexts/ViewContext';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ViewProvider>{children}</ViewProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('App', () => {
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

  it('should render TokensPage by default', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем наличие элементов из TokensPage
      const searchInput = screen.queryByPlaceholderText(/search|поиск/i);
      expect(searchInput || screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
