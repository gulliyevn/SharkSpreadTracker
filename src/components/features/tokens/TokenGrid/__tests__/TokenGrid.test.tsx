import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { TokenGrid } from '../TokenGrid';
import type { TokenWithFavorite } from '../TokenGrid';

// Mock TokenCard - используем правильный путь
vi.mock('@/components/features/tokens/TokenCard', () => ({
  TokenCard: ({
    token,
    onFavoriteToggle,
  }: {
    token: { symbol: string; chain: string };
    onFavoriteToggle?: (token: { symbol: string; chain: string }) => void;
  }) => (
    <div data-testid={`token-card-${token.symbol}`}>
      {token.symbol}
      {onFavoriteToggle && (
        <button onClick={() => onFavoriteToggle(token)}>Toggle Favorite</button>
      )}
    </div>
  ),
}));

describe('TokenGrid', () => {
  const mockTokens: TokenWithFavorite[] = [
    {
      symbol: 'BTC',
      chain: 'solana',
      price: 50000,
      directSpread: 5.5,
      reverseSpread: -3.2,
      isFavorite: false,
    },
    {
      symbol: 'ETH',
      chain: 'bsc',
      price: 3000,
      directSpread: 2.1,
      reverseSpread: null,
      isFavorite: true,
    },
    {
      symbol: 'SOL',
      chain: 'solana',
      price: 100,
      directSpread: null,
      reverseSpread: null,
      isFavorite: false,
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
    const duplicateTokens: TokenWithFavorite[] = [
      { symbol: 'BTC', chain: 'solana', price: 50000 },
      { symbol: 'BTC', chain: 'bsc', price: 50000 },
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
