import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExchangeIndicator } from '../ExchangeIndicator';

describe('ExchangeIndicator', () => {
  it('should render exchange indicator', () => {
    render(<ExchangeIndicator sourceChain="bsc" targetExchange="MEXC" />);
    expect(screen.getByText('BSC')).toBeInTheDocument();
    expect(screen.getByText('MEXC')).toBeInTheDocument();
  });

  it('should display Solana chain', () => {
    render(<ExchangeIndicator sourceChain="solana" targetExchange="MEXC" />);
    expect(screen.getByText('SOLANA')).toBeInTheDocument();
  });

  it('should display BSC chain', () => {
    render(<ExchangeIndicator sourceChain="bsc" targetExchange="MEXC" />);
    expect(screen.getByText('BSC')).toBeInTheDocument();
  });

  it('should display target exchange', () => {
    render(<ExchangeIndicator sourceChain="bsc" targetExchange="JUPITER" />);
    expect(screen.getByText('JUPITER')).toBeInTheDocument();
  });
});

