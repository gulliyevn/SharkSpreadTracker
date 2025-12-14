import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenCard } from '../TokenCard';
import type { Token } from '@/types';

const mockToken: Token = {
  symbol: 'BTC',
  chain: 'solana',
};

describe('TokenCard', () => {
  it('should render token symbol', () => {
    render(<TokenCard token={mockToken} />);
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('should display price', () => {
    render(<TokenCard token={mockToken} price={50000} />);
    expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
  });

  it('should display "—" for null price', () => {
    render(<TokenCard token={mockToken} price={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should display direct spread', () => {
    render(<TokenCard token={mockToken} directSpread={5.5} />);
    expect(screen.getByText('+5.50%')).toBeInTheDocument();
  });

  it('should display reverse spread', () => {
    render(<TokenCard token={mockToken} reverseSpread={-3.2} />);
    expect(screen.getByText('-3.20%')).toBeInTheDocument();
  });

  it('should call onFavoriteToggle when favorite button is clicked', async () => {
    const user = userEvent.setup();
    const onFavoriteToggle = vi.fn();

    render(
      <TokenCard token={mockToken} onFavoriteToggle={onFavoriteToggle} />
    );

    const favoriteButton = screen.getByRole('button', {
      name: /add to favorites|remove from favorites/i,
    });
    await user.click(favoriteButton);

    expect(onFavoriteToggle).toHaveBeenCalledWith(mockToken);
  });

  it('should show filled star when isFavorite is true', () => {
    render(<TokenCard token={mockToken} isFavorite={true} />);
    const favoriteButton = screen.getByRole('button', {
      name: /remove from favorites/i,
    });
    expect(favoriteButton).toBeInTheDocument();
  });
});

