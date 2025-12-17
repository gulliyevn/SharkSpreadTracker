import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

// Mock для requestAnimationFrame и getBoundingClientRect
beforeEach(() => {
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0) as unknown as number);
  global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

  // Mock getBoundingClientRect
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 100,
    height: 50,
    top: 0,
    left: 0,
    bottom: 50,
    right: 100,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  }));
});

describe('Tooltip', () => {
  it('should render children', () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('should not show tooltip initially', () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
  });

  it('should show tooltip on hover', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip content" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);

    await waitFor(
      () => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should hide tooltip on mouse leave', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip content" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);

    await waitFor(
      () => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    await user.unhover(button);

    await waitFor(
      () => {
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should not show tooltip when disabled', () => {
    render(
      <Tooltip content="Tooltip content" disabled>
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
  });

  it('should render with different positions', () => {
    const { rerender } = render(
      <Tooltip content="Tooltip" position="top">
        <button>Button</button>
      </Tooltip>
    );

    expect(screen.getByText('Button')).toBeInTheDocument();

    rerender(
      <Tooltip content="Tooltip" position="bottom">
        <button>Button</button>
      </Tooltip>
    );

    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('should accept ReactNode as content', () => {
    render(
      <Tooltip content={<span>Custom content</span>}>
        <button>Button</button>
      </Tooltip>
    );

    expect(screen.getByText('Button')).toBeInTheDocument();
  });
});

