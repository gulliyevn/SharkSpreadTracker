import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('should render badge with text', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    expect(container.firstChild).toHaveClass('bg-success-100');
  });

  it('should apply size classes', () => {
    const { container } = render(<Badge size="lg">Large</Badge>);
    expect(container.firstChild).toHaveClass('px-3');
  });

  it('should render with default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-light-200');
  });
});
