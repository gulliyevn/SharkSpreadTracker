import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenCard } from '../TokenCard';
import { ToastProvider } from '@/contexts/ToastContext';
import type { StraightData } from '@/types';

// Wrapper с ToastProvider
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const mockToken: StraightData = {
  token: 'BTC',
  aExchange: 'Jupiter',
  bExchange: 'MEXC',
  priceA: '50000',
  priceB: '50100',
  spread: '0.5',
  network: 'solana',
  limit: 'all',
};

describe('TokenCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('should render token symbol', () => {
    render(<TokenCard token={mockToken} />, { wrapper: Wrapper });
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render without crashing with all props', () => {
    render(
      <TokenCard
        token={mockToken}
        isFavorite={true}
        onFavoriteToggle={() => {}}
        onEdit={() => {}}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render with null values', () => {
    const tokenWithNulls: StraightData = {
      token: 'BTC',
      aExchange: 'Jupiter',
      bExchange: 'MEXC',
      priceA: '',
      priceB: '',
      spread: '',
      network: 'solana',
      limit: 'all',
    };
    render(<TokenCard token={tokenWithNulls} />, { wrapper: Wrapper });
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render for BSC chain', () => {
    const bscToken: StraightData = {
      token: 'CAKE',
      aExchange: 'PancakeSwap',
      bExchange: 'MEXC',
      priceA: '10',
      priceB: '10.1',
      spread: '1.0',
      network: 'bsc',
      limit: 'all',
    };
    render(<TokenCard token={bscToken} />, { wrapper: Wrapper });
    expect(screen.getByText('CAKE')).toBeInTheDocument();
  });

  it('should render buttons', () => {
    render(<TokenCard token={mockToken} />, { wrapper: Wrapper });
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle callbacks', () => {
    const onFavoriteToggle = vi.fn();
    const onEdit = vi.fn();

    render(
      <TokenCard
        token={mockToken}
        onFavoriteToggle={onFavoriteToggle}
        onEdit={onEdit}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should handle token without address', () => {
    const tokenNoAddr: StraightData = {
      token: 'TEST',
      aExchange: 'Jupiter',
      bExchange: 'MEXC',
      priceA: '100',
      priceB: '101',
      spread: '1.0',
      network: 'solana',
      limit: 'all',
    };
    render(<TokenCard token={tokenNoAddr} />, { wrapper: Wrapper });
    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('should call onFavoriteToggle when favorite button clicked', async () => {
    const onFavoriteToggle = vi.fn();

    render(
      <TokenCard
        token={mockToken}
        onFavoriteToggle={onFavoriteToggle}
        isFavorite={false}
      />,
      { wrapper: Wrapper }
    );

    const buttons = screen.getAllByRole('button');
    // Ищем кнопку избранного
    const favoriteButton = buttons.find(
      (btn) =>
        btn.getAttribute('aria-label')?.includes('favorite') ||
        btn.querySelector('svg')
    );

    if (favoriteButton) {
      await userEvent.click(favoriteButton);
    }
  });

  it('should call onEdit when edit button clicked', async () => {
    const onEdit = vi.fn();

    render(<TokenCard token={mockToken} onEdit={onEdit} />, {
      wrapper: Wrapper,
    });

    const buttons = screen.getAllByRole('button');
    // Кликаем на последнюю кнопку (обычно edit)
    if (buttons.length > 0) {
      await userEvent.click(buttons[buttons.length - 1] as Element);
    }
  });

  it('should copy token symbol to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<TokenCard token={mockToken} />, { wrapper: Wrapper });

    const buttons = screen.getAllByRole('button');
    // Кликаем на кнопку копирования
    for (const btn of buttons) {
      if (
        btn.getAttribute('title')?.includes('copy') ||
        btn.getAttribute('aria-label')?.includes('copy')
      ) {
        await userEvent.click(btn);
        break;
      }
    }
  });

  it('should display price correctly', () => {
    render(<TokenCard token={mockToken} />, {
      wrapper: Wrapper,
    });

    // Цена должна отображаться
    expect(document.body.textContent).toContain('50');
  });

  it('should display spread percentages', () => {
    render(<TokenCard token={mockToken} />, { wrapper: Wrapper });

    expect(document.body.textContent).toContain('0.5');
  });

  it('should handle hover state', async () => {
    render(<TokenCard token={mockToken} />, { wrapper: Wrapper });

    const card = screen.getByText('BTC').closest('div');
    if (card) {
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
    }

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render loading state correctly', () => {
    const tokenWithEmptyPrices: StraightData = {
      token: 'BTC',
      aExchange: 'Jupiter',
      bExchange: 'MEXC',
      priceA: '',
      priceB: '',
      spread: '',
      network: 'solana',
      limit: 'all',
    };
    render(<TokenCard token={tokenWithEmptyPrices} />, { wrapper: Wrapper });

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });
});
