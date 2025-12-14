import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenFilters } from '../TokenFilters';
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

describe('TokenFilters', () => {
  it('should render min spread input', async () => {
    const onMinSpreadChange = vi.fn();
    render(
      <TestWrapper>
        <TokenFilters
          minSpread={0}
          onMinSpreadChange={onMinSpreadChange}
          showDirectOnly={false}
          onDirectOnlyChange={vi.fn()}
          showReverseOnly={false}
          onReverseOnlyChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const input = screen.getByLabelText(/OT|min spread/i);
      expect(input).toBeInTheDocument();
    });
  });

  it('should call onMinSpreadChange when min spread changes', async () => {
    const user = userEvent.setup();
    const onMinSpreadChange = vi.fn();

    render(
      <TestWrapper>
        <TokenFilters
          minSpread={0}
          onMinSpreadChange={onMinSpreadChange}
          showDirectOnly={false}
          onDirectOnlyChange={vi.fn()}
          showReverseOnly={false}
          onReverseOnlyChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const input = screen.getByLabelText(/OT|min spread/i);
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/OT|min spread/i);
    await user.clear(input);
    await user.type(input, '5');

    expect(onMinSpreadChange).toHaveBeenCalled();
  });

  it('should toggle direct only filter', async () => {
    const user = userEvent.setup();
    const onDirectOnlyChange = vi.fn();

    render(
      <TestWrapper>
        <TokenFilters
          minSpread={0}
          onMinSpreadChange={vi.fn()}
          showDirectOnly={false}
          onDirectOnlyChange={onDirectOnlyChange}
          showReverseOnly={false}
          onReverseOnlyChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByText(/only direct|только прямой/i);
      expect(button).toBeInTheDocument();
    });

    const button = screen.getByText(/only direct|только прямой/i);
    await user.click(button);

    expect(onDirectOnlyChange).toHaveBeenCalledWith(true);
  });

  it('should toggle reverse only filter', async () => {
    const user = userEvent.setup();
    const onReverseOnlyChange = vi.fn();

    render(
      <TestWrapper>
        <TokenFilters
          minSpread={0}
          onMinSpreadChange={vi.fn()}
          showDirectOnly={false}
          onDirectOnlyChange={vi.fn()}
          showReverseOnly={false}
          onReverseOnlyChange={onReverseOnlyChange}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByText(/only reverse|только обратный/i);
      expect(button).toBeInTheDocument();
    });

    const button = screen.getByText(/only reverse|только обратный/i);
    await user.click(button);

    expect(onReverseOnlyChange).toHaveBeenCalledWith(true);
  });
});

