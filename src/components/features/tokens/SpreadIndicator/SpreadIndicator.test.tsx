import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpreadIndicator } from './SpreadIndicator';

describe('SpreadIndicator', () => {
  it('renders dash for null value', () => {
    render(<SpreadIndicator value={null} type="direct" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats positive direct spread with plus sign', () => {
    render(<SpreadIndicator value={5.25} type="direct" />);
    expect(screen.getByText('+5.25%')).toBeInTheDocument();
  });

  it('formats negative reverse spread', () => {
    render(<SpreadIndicator value={-3.1} type="reverse" />);
    expect(screen.getByText('-3.10%')).toBeInTheDocument();
  });
});


