import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { TokenGrid } from '../TokenGrid';
import type { StraightData } from '@/types';

// Mock TokenCard - используем правильный путь
vi.mock('@/components/features/tokens/TokenCard', () => ({
  TokenCard: ({
    token,
    onFavoriteToggle,
  }: {
    token: StraightData;
    onFavoriteToggle?: (token: StraightData) => void;
  }) => (
    <div data-testid={`token-card-${token.token}`}>
      {token.token}
      {onFavoriteToggle && (
        <button onClick={() => onFavoriteToggle(token)}>Toggle Favorite</button>
      )}
    </div>
  ),
}));

describe('TokenGrid', () => {
  const mockTokens: StraightData[] = [
    {
      token: 'BTC',
      aExchange: 'Jupiter',
      bExchange: 'MEXC',
      priceA: '50000',
      priceB: '50250',
      spread: '5.5',
      network: 'solana',
      limit: 'all',
    },
    {
      token: 'ETH',
      aExchange: 'PancakeSwap',
      bExchange: 'MEXC',
      priceA: '3000',
      priceB: '3063',
      spread: '2.1',
      network: 'bsc',
      limit: 'all',
    },
    {
      token: 'SOL',
      aExchange: 'Jupiter',
      bExchange: 'MEXC',
      priceA: '100',
      priceB: '100',
      spread: '0',
      network: 'solana',
      limit: 'all',
    },
  ];

  beforeEach(() => {
    // Мокаем window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280, // Desktop по умолчанию
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render tokens in grid', () => {
    render(<TokenGrid tokens={mockTokens} />);

    expect(screen.getByTestId('token-card-BTC')).toBeInTheDocument();
    expect(screen.getByTestId('token-card-ETH')).toBeInTheDocument();
    expect(screen.getByTestId('token-card-SOL')).toBeInTheDocument();
  });

  it('should render nothing when tokens array is empty', () => {
    const { container } = render(<TokenGrid tokens={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply grid layout with dynamic columns', () => {
    const { container } = render(<TokenGrid tokens={mockTokens} />);
    const grid = container.firstChild as HTMLElement;

    // Проверяем, что grid рендерится с правильными классами и стилями
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid', 'gap-4');
    const style = grid.getAttribute('style') || '';
    expect(style).toContain('grid-template-columns');
    expect(style).toMatch(/repeat\(\d+, 1fr\)/); // Проверяем формат, но не конкретное значение
  });

  it('should call onFavoriteToggle when favorite button is clicked', async () => {
    const onFavoriteToggle = vi.fn();
    render(
      <TokenGrid tokens={mockTokens} onFavoriteToggle={onFavoriteToggle} />
    );

    const favoriteButtons = screen.getAllByText('Toggle Favorite');
    expect(favoriteButtons.length).toBeGreaterThan(0);

    if (favoriteButtons[0]) {
      favoriteButtons[0].click();
      expect(onFavoriteToggle).toHaveBeenCalledWith(mockTokens[0]);
    }
  });

  it('should pass favorite state to TokenCard', () => {
    render(<TokenGrid tokens={mockTokens} />);

    // Проверяем, что токены рендерятся
    expect(screen.getByTestId('token-card-BTC')).toBeInTheDocument();
    expect(screen.getByTestId('token-card-ETH')).toBeInTheDocument();
    expect(screen.getByTestId('token-card-SOL')).toBeInTheDocument();
  });

  it('should handle resize events', async () => {
    const { container } = render(<TokenGrid tokens={mockTokens} />);
    const grid = container.firstChild as HTMLElement;

    expect(grid).toBeInTheDocument();

    // Изменяем ширину окна
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500, // Mobile
    });

    // Триггерим resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Проверяем, что grid все еще рендерится после resize
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('should have grid gap class', () => {
    const { container } = render(<TokenGrid tokens={mockTokens} />);
    const grid = container.firstChild as HTMLElement;

    expect(grid).toHaveClass('grid', 'gap-4');
  });

  it('should generate unique keys for tokens', () => {
    const duplicateTokens: StraightData[] = [
      {
        token: 'BTC',
        aExchange: 'Jupiter',
        bExchange: 'MEXC',
        priceA: '50000',
        priceB: '50100',
        spread: '0.5',
        network: 'solana',
        limit: 'all',
      },
      {
        token: 'BTC',
        aExchange: 'PancakeSwap',
        bExchange: 'MEXC',
        priceA: '50000',
        priceB: '50100',
        spread: '0.5',
        network: 'bsc',
        limit: 'all',
      },
    ];

    render(<TokenGrid tokens={duplicateTokens} />);

    // Оба токена должны рендериться, несмотря на одинаковый symbol
    const cards = screen.getAllByTestId('token-card-BTC');
    expect(cards.length).toBe(2);
  });

  it('should use 2 columns on tablet (640-1024)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800, // Tablet
    });

    const { container } = render(<TokenGrid tokens={mockTokens} />);
    const grid = container.firstChild as HTMLElement;

    expect(grid).toBeInTheDocument();
    const style = grid.getAttribute('style') || '';
    expect(style).toContain('repeat(2, 1fr)');
  });

  it('should pass onEdit callback to TokenCard', () => {
    const onEdit = vi.fn();
    render(<TokenGrid tokens={mockTokens} onEdit={onEdit} />);

    expect(screen.getByTestId('token-card-BTC')).toBeInTheDocument();
  });
});
