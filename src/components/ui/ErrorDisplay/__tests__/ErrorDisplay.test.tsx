import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDisplay } from '../ErrorDisplay';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@/lib/i18n'; // Инициализация i18n

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

describe('ErrorDisplay', () => {
  it('should render error message', async () => {
    const error = new Error('Test error');
    render(
      <TestWrapper>
        <ErrorDisplay error={error} />
      </TestWrapper>
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/test error|an unknown error/i)).toBeInTheDocument();
  });

  it('should display custom title', async () => {
    const error = new Error('Test error');
    render(
      <TestWrapper>
        <ErrorDisplay error={error} title="Custom Title" />
      </TestWrapper>
    );
    await waitFor(() => {
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  it('should call onReset when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const error = new Error('Test error');

    render(
      <TestWrapper>
        <ErrorDisplay error={error} onReset={onReset} />
      </TestWrapper>
    );

    const retryButton = screen.getByRole('button', { name: /try again|попробовать|tekrar dene/i });
    await user.click(retryButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should call onGoHome when home button is clicked', async () => {
    const user = userEvent.setup();
    const onGoHome = vi.fn();
    const error = new Error('Test error');

    render(
      <TestWrapper>
        <ErrorDisplay error={error} onGoHome={onGoHome} />
      </TestWrapper>
    );

    const homeButton = screen.getByRole('button', { name: /go home|на главную|ana sayfaya/i });
    await user.click(homeButton);

    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('should show details when showDetails is true', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    render(
      <TestWrapper>
        <ErrorDisplay error={error} showDetails={true} />
      </TestWrapper>
    );

    const details = screen.getByText(/details|детали|detaylar/i);
    expect(details).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const error = new Error('Test error');
    const { container } = render(
      <TestWrapper>
        <ErrorDisplay error={error} className="custom-class" />
      </TestWrapper>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle null error', () => {
    render(
      <TestWrapper>
        <ErrorDisplay error={null} />
      </TestWrapper>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

