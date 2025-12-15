import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render spinner', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply sm size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('should apply md size by default', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('should apply lg size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-12', 'w-12');
  });

  it('should have accessible label', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});
