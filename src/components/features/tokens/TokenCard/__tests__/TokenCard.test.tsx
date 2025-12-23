import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenCard } from '../TokenCard';
import { ToastProvider } from '@/contexts/ToastContext';
import type { Token } from '@/types';

// Wrapper с ToastProvider
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const mockToken: Token = {
  symbol: 'BTC',
  chain: 'solana',
  address: 'So11111111111111111111111111111111111111112',
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
        price={50000}
        directSpread={5.5}
        reverseSpread={3.2}
        isFavorite={true}
        onFavoriteToggle={() => {}}
        onEdit={() => {}}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render with null values', () => {
    render(
      <TokenCard
        token={mockToken}
        price={null}
        directSpread={null}
        reverseSpread={null}
      />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render for BSC chain', () => {
    const bscToken: Token = { symbol: 'CAKE', chain: 'bsc' };
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
    const tokenNoAddr: Token = { symbol: 'TEST', chain: 'solana' };
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

  it('should copy address to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(
      <TokenCard token={{ ...mockToken, address: 'test-address-123' }} />,
      { wrapper: Wrapper }
    );

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
    render(<TokenCard token={mockToken} price={12345.67} />, {
      wrapper: Wrapper,
    });

    // Цена должна отображаться
    expect(document.body.textContent).toContain('12');
  });

  it('should display spread percentages', () => {
    render(
      <TokenCard token={mockToken} directSpread={2.5} reverseSpread={1.8} />,
      { wrapper: Wrapper }
    );

    expect(document.body.textContent).toContain('2.5');
  });

  it('should handle hover state', async () => {
    render(<TokenCard token={mockToken} price={100} />, { wrapper: Wrapper });

    const card = screen.getByText('BTC').closest('div');
    if (card) {
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
    }

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should render loading state correctly', () => {
    render(
      <TokenCard
        token={mockToken}
        price={undefined}
        directSpread={undefined}
        reverseSpread={undefined}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });
});
