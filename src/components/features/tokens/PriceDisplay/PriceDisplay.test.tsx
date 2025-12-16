import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceDisplay } from './PriceDisplay';

describe('PriceDisplay', () => {
  it('renders dash for null value', () => {
    render(<PriceDisplay value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats price as USD by default', () => {
    render(<PriceDisplay value={50000} />);
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('respects fractionDigits', () => {
    render(<PriceDisplay value={1234.56} fractionDigits={2} />);
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });
});


