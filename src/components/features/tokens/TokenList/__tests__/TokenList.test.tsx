import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenList } from '../TokenList';
import type { Token } from '@/types';

const mockTokens: Token[] = [
  { symbol: 'BTC', chain: 'solana' },
  { symbol: 'ETH', chain: 'bsc' },
  { symbol: 'SOL', chain: 'solana' },
];

describe('TokenList', () => {
  it('should render list of tokens', () => {
    render(<TokenList tokens={mockTokens} />);
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('SOL')).toBeInTheDocument();
  });

  it('should filter tokens by search term', () => {
    render(<TokenList tokens={mockTokens} searchTerm="BTC" />);
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.queryByText('ETH')).not.toBeInTheDocument();
    expect(screen.queryByText('SOL')).not.toBeInTheDocument();
  });

  it('should display "No tokens found" when filtered list is empty', () => {
    render(<TokenList tokens={mockTokens} searchTerm="XYZ" />);
    expect(screen.getByText(/no tokens found/i)).toBeInTheDocument();
  });

  it('should display "No tokens found" when tokens array is empty', () => {
    render(<TokenList tokens={[]} />);
    expect(screen.getByText(/no tokens found/i)).toBeInTheDocument();
  });
});
