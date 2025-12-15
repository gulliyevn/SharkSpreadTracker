import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TokenCardSkeleton } from '../TokenCardSkeleton';

describe('TokenCardSkeleton', () => {
  it('should render skeleton', () => {
    const { container } = render(<TokenCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have skeleton classes', () => {
    const { container } = render(<TokenCardSkeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
  });
});
