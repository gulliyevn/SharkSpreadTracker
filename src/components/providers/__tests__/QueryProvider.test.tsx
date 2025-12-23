import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryProvider } from '../QueryProvider';
import { useQuery } from '@tanstack/react-query';

function TestComponent() {
  const { isSuccess } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test'),
    enabled: false,
  });

  return (
    <div data-testid="query-provider">{isSuccess ? 'ready' : 'not ready'}</div>
  );
}

describe('QueryProvider', () => {
  it('should render children', () => {
    render(
      <QueryProvider>
        <div>Test content</div>
      </QueryProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should provide QueryClient context', () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
  });
});
