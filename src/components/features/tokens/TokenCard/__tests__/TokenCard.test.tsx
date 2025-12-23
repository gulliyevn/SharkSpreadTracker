import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
