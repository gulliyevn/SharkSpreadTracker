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
    // Проверяем, что компонент рендерится и имеет правильные классы
    expect(skeleton).toHaveClass('bg-light-50');
    // Проверяем, что внутри есть Skeleton компоненты (они имеют animate-pulse)
    const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});
