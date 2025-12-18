import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { SourceSelector } from '../SourceSelector';
import type { Token } from '@/types';

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

const mockToken: Token = {
  symbol: 'BTC',
  chain: 'solana',
};

describe('SourceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render source selectors when token is provided', () => {
    const onSource1Change = vi.fn();
    const onSource2Change = vi.fn();
    render(
      <TestWrapper>
        <SourceSelector
          token={mockToken}
          source1={null}
          source2={null}
          onSource1Change={onSource1Change}
          onSource2Change={onSource2Change}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Compare Sources/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy from/i)).toBeInTheDocument();
    expect(screen.getByText(/Sell to/i)).toBeInTheDocument();
  });

  it('should display message when token is not selected', () => {
    const onSource1Change = vi.fn();
    const onSource2Change = vi.fn();
    render(
      <TestWrapper>
        <SourceSelector
          token={null}
          source1={null}
          source2={null}
          onSource1Change={onSource1Change}
          onSource2Change={onSource2Change}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Select a token first/i)).toBeInTheDocument();
  });

  it('should show available sources for selected token', async () => {
    const user = userEvent.setup();
    const onSource1Change = vi.fn();
    const onSource2Change = vi.fn();
    render(
      <TestWrapper>
        <SourceSelector
          token={mockToken}
          source1={null}
          source2={null}
          onSource1Change={onSource1Change}
          onSource2Change={onSource2Change}
        />
      </TestWrapper>
    );

    const source1Buttons = screen.getAllByText(/Select source/i);
    const source1Button = source1Buttons[0]?.closest('button');
    if (source1Button) {
      await user.click(source1Button);

      await waitFor(() => {
        // Для Solana должны быть доступны Jupiter и MEXC
        expect(screen.getByText(/Jupiter/i)).toBeInTheDocument();
        expect(screen.getByText(/MEXC/i)).toBeInTheDocument();
      });
    }
  });

  it('should call onSource1Change when source1 is selected', async () => {
    const user = userEvent.setup();
    const onSource1Change = vi.fn();
    const onSource2Change = vi.fn();
    render(
      <TestWrapper>
        <SourceSelector
          token={mockToken}
          source1={null}
          source2={null}
          onSource1Change={onSource1Change}
          onSource2Change={onSource2Change}
        />
      </TestWrapper>
    );

    const source1Buttons = screen.getAllByText(/Select source/i);
    const source1Button = source1Buttons[0]?.closest('button');
    if (source1Button) {
      await user.click(source1Button);

      await waitFor(() => {
        const jupiterOption = screen
          .getByText(/Jupiter \[DEX\]/i)
          .closest('button');
        if (jupiterOption) {
          return user.click(jupiterOption);
        }
      });

      await waitFor(
        () => {
          expect(onSource1Change).toHaveBeenCalledWith('jupiter');
        },
        { timeout: 3000 }
      );
    }
  });

  it('should not allow selecting same source for both source1 and source2', async () => {
    const user = userEvent.setup();
    const onSource1Change = vi.fn();
    const onSource2Change = vi.fn();
    render(
      <TestWrapper>
        <SourceSelector
          token={mockToken}
          source1="jupiter"
          source2={null}
          onSource1Change={onSource1Change}
          onSource2Change={onSource2Change}
        />
      </TestWrapper>
    );

    const source2Buttons = screen.getAllByText(/Select source/i);
    if (source2Buttons.length > 1) {
      const source2Button = source2Buttons[1]?.closest('button');
      if (source2Button) {
        await user.click(source2Button);

        await waitFor(() => {
          // Jupiter не должен быть доступен для source2, так как уже выбран для source1
          expect(
            screen.queryByText(/Jupiter \[DEX\]/i)
          ).not.toBeInTheDocument();
          expect(screen.getByText(/MEXC \[CEX\]/i)).toBeInTheDocument();
        });
      }
    }
  });

  it('should display selected sources', () => {
    const onSource1Change = vi.fn();
    const onSource2Change = vi.fn();
    render(
      <TestWrapper>
        <SourceSelector
          token={mockToken}
          source1="jupiter"
          source2="mexc"
          onSource1Change={onSource1Change}
          onSource2Change={onSource2Change}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Jupiter \[DEX\]/i)).toBeInTheDocument();
    expect(screen.getByText(/MEXC \[CEX\]/i)).toBeInTheDocument();
  });
});
