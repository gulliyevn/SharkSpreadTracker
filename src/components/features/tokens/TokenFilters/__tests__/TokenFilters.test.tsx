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

    // Ищем input по типу number (более надежно, чем по label)
    await waitFor(() => {
      const input = screen.getByRole('spinbutton') || 
                    screen.getByDisplayValue('0') ||
                    document.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    }, { timeout: 3000 });
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

    // Ищем input по значению или типу
    const input = await screen.findByDisplayValue('0', {}, { timeout: 3000 }) ||
                  screen.getByRole('spinbutton') as HTMLInputElement;
    
    await user.clear(input);
    await user.type(input, '5');

    // Проверяем, что onChange был вызван
    await waitFor(() => {
      expect(onMinSpreadChange).toHaveBeenCalled();
    }, { timeout: 2000 });
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

    // Ищем кнопку по тексту (может быть на разных языках)
    const button = await screen.findByRole('button', {
      name: /only direct|только прямой|direct/i
    }, { timeout: 3000 });
    
    await user.click(button);

    await waitFor(() => {
      expect(onDirectOnlyChange).toHaveBeenCalledWith(true);
    }, { timeout: 2000 });
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

    // Ищем кнопку по тексту (может быть на разных языках)
    const button = await screen.findByRole('button', {
      name: /only reverse|только обратный|reverse/i
    }, { timeout: 3000 });
    
    await user.click(button);

    await waitFor(() => {
      expect(onReverseOnlyChange).toHaveBeenCalledWith(true);
    }, { timeout: 2000 });
  });
});
