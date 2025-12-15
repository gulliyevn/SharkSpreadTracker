import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container } from '../Container';

describe('Container', () => {
  it('should render children', () => {
    render(
      <Container>
        <div>Test content</div>
      </Container>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply default container classes', () => {
    const { container } = render(
      <Container>
        <div>Content</div>
      </Container>
    );
    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('container', 'mx-auto');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Container className="custom-class">
        <div>Content</div>
      </Container>
    );
    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('custom-class');
  });
});
