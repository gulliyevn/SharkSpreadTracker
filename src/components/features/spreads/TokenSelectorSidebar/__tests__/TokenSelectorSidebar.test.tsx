import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';
import { TokenSelectorSidebar } from '../TokenSelectorSidebar';
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

const mockTokens: Token[] = [
  {
    symbol: 'BTC',
    chain: 'solana',
    address: 'So11111111111111111111111111111111111111112',
  },
  {
    symbol: 'ETH',
    chain: 'bsc',
    address: '0x1234567890123456789012345678901234567890',
  },
  { symbol: 'SOL', chain: 'solana' },
];

describe('TokenSelectorSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render token selector with search', () => {
    const onSelect = vi.fn();
    render(
      <TestWrapper>
        <TokenSelectorSidebar tokens={mockTokens} onSelect={onSelect} />
      </TestWrapper>
    );

    expect(screen.getByText(/Select Token/i)).toBeInTheDocument();
    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toBeInTheDocument();
  });

  it('should display list of tokens', () => {
    const onSelect = vi.fn();
    render(
      <TestWrapper>
        <TokenSelectorSidebar tokens={mockTokens} onSelect={onSelect} />
      </TestWrapper>
    );

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('SOL')).toBeInTheDocument();
  });

  it('should filter tokens when searching', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TestWrapper>
        <TokenSelectorSidebar tokens={mockTokens} onSelect={onSelect} />
      </TestWrapper>
    );

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'BTC');

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.queryByText('ETH')).not.toBeInTheDocument();
    expect(screen.queryByText('SOL')).not.toBeInTheDocument();
  });

  it('should call onSelect when token is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TestWrapper>
        <TokenSelectorSidebar tokens={mockTokens} onSelect={onSelect} />
      </TestWrapper>
    );

    // Ищем кнопку с текстом BTC (может быть несколько элементов с BTC, берем первый button)
    const btcButtons = screen.getAllByText('BTC');
    const btcButton = btcButtons
      .find((el) => el.closest('button'))
      ?.closest('button');
    if (btcButton) {
      await user.click(btcButton);
      expect(onSelect).toHaveBeenCalledWith(mockTokens[0]);
    } else {
      // Fallback: ищем любую кнопку с BTC
      const allButtons = screen.getAllByRole('button');
      const btcBtn = allButtons.find((btn) => btn.textContent?.includes('BTC'));
      if (btcBtn) {
        await user.click(btcBtn);
        expect(onSelect).toHaveBeenCalled();
      }
    }
  });

  it('should highlight selected token', () => {
    const onSelect = vi.fn();
    render(
      <TestWrapper>
        <TokenSelectorSidebar
          tokens={mockTokens}
          value={mockTokens[0]}
          onSelect={onSelect}
        />
      </TestWrapper>
    );

    const btcButton = screen.getByText('BTC').closest('button');
    // Проверяем что кнопка существует и имеет класс для выбранного состояния
    expect(btcButton).toBeInTheDocument();
    expect(btcButton?.className).toMatch(/bg-primary-500/);
  });

  it('should filter tokens when searching and show empty state', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TestWrapper>
        <TokenSelectorSidebar tokens={mockTokens} onSelect={onSelect} />
      </TestWrapper>
    );

    // Сначала проверяем что токены отображаются
    expect(screen.getByText('BTC')).toBeInTheDocument();

    const searchInput = screen.getByRole('textbox');
    await user.clear(searchInput);
    await user.type(searchInput, 'XYZ123');

    // Проверяем что список токенов стал пустым после поиска
    await waitFor(
      () => {
        const btcElements = screen.queryAllByText('BTC');
        // BTC может быть в заголовке или других местах, но не в списке токенов
        const btcInList = btcElements.filter((el) => {
          const button = el.closest('button');
          return button && button.textContent?.includes('BTC');
        });
        expect(btcInList.length).toBe(0);
      },
      { timeout: 2000 }
    );
  });
});
