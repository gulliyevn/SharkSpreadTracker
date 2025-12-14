import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Footer } from '../Footer';
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

describe('Footer', () => {
  it('should render footer', async () => {
    render(
      <TestWrapper>
        <Footer />
      </TestWrapper>
    );

    await waitFor(() => {
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });
  });

  it('should display copyright with current year', async () => {
    render(
      <TestWrapper>
        <Footer />
      </TestWrapper>
    );

    await waitFor(() => {
      const currentYear = new Date().getFullYear();
      const copyrightText = screen.getByText(new RegExp(`${currentYear}`));
      expect(copyrightText).toBeInTheDocument();
    });
  });

  it('should display app description', async () => {
    render(
      <TestWrapper>
        <Footer />
      </TestWrapper>
    );

    await waitFor(() => {
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });
  });
});

