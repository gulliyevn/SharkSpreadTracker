import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChartsPage } from '../ChartsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@/lib/i18n';

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
  it('should render ChartsPage', async () => {
    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/charts|графики/i)).toBeInTheDocument();
    });
  });

  it('should display coming soon message', async () => {
    render(
      <TestWrapper>
        <ChartsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/coming soon|скоро/i)).toBeInTheDocument();
    });
  });
});
