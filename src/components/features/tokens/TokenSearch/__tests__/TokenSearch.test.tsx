import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenSearch } from '../TokenSearch';
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

describe('TokenSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render search input', async () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TokenSearch value="" onChange={onChange} />
      </TestWrapper>
    );

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search|поиск|ara/i);
      expect(input).toBeInTheDocument();
    });
  });

  it('should display placeholder', async () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TokenSearch
          value=""
          onChange={onChange}
          placeholder="Search tokens..."
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Search tokens...');
      expect(input).toBeInTheDocument();
    });
  });

  it('should call onChange when typing', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();

    render(
      <TestWrapper>
        <TokenSearch value="" onChange={onChange} />
      </TestWrapper>
    );

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search|поиск|ara/i);
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search|поиск|ara/i);
    await user.type(input, 'BTC');

    // Debounce delay
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('should display current value', async () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TokenSearch value="BTC" onChange={onChange} />
      </TestWrapper>
    );

    await waitFor(
      () => {
        const input = screen.getByDisplayValue('BTC');
        expect(input).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
