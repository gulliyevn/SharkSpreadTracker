import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyState title="No data" description="Try again later" />);
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('should render action', () => {
    render(
      <EmptyState title="No data" action={<button>Retry</button>} />
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should render with different icon types', () => {
    const { rerender } = render(<EmptyState title="No data" icon="search" />);
    expect(screen.getByText('No data')).toBeInTheDocument();

    rerender(<EmptyState title="No data" icon="alert" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should render custom icon', () => {
    render(
      <EmptyState title="No data" icon={<span>Custom Icon</span>} />
    );
    expect(screen.getByText('Custom Icon')).toBeInTheDocument();
  });
});

