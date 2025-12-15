import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('should render skeleton', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('status', { name: /loading/i });
    expect(skeleton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply text variant', () => {
    const { container } = render(<Skeleton variant="text" />);
    expect(container.firstChild).toHaveClass('h-4');
  });

  it('should apply circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('should apply rectangular variant by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded');
  });
});
