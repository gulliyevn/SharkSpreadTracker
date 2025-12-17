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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render search input', async () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TokenSearch value="" onChange={onChange} />
      </TestWrapper>
    );

    // Ищем input по роли (более надежно, чем по placeholder)
    const input = await screen.findByRole('textbox', {}, { timeout: 5000 });
    expect(input).toBeInTheDocument();
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

    // Если передан явный placeholder, он должен использоваться
    const input = await screen.findByPlaceholderText('Search tokens...', {}, { timeout: 5000 });
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();

    render(
      <TestWrapper>
        <TokenSearch value="" onChange={onChange} />
      </TestWrapper>
    );

    // Ждем появления input
    const input = await screen.findByRole('textbox', {}, { timeout: 5000 });
    
    // Вводим текст
    await user.type(input, 'BTC');

    // Ждем debounce delay (300ms) + небольшой запас
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should display current value', async () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TokenSearch value="BTC" onChange={onChange} />
      </TestWrapper>
    );

    // Ждем рендера и проверяем, что значение отображается
    const input = await screen.findByDisplayValue('BTC', {}, { timeout: 5000 }) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('BTC');
  });
});
