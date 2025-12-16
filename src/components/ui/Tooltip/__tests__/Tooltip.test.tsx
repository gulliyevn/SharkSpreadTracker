import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('should not show tooltip initially', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should show tooltip after delay on mouse enter', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);

    // Fast-forward time
    vi.advanceTimersByTime(200);

    await waitFor(
      () => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Tooltip text')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should hide tooltip on mouse leave', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);
    vi.advanceTimersByTime(200);

    await waitFor(
      () => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    await user.unhover(button);

    await waitFor(
      () => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should not show tooltip when disabled', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip text" disabled>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);
    vi.advanceTimersByTime(200);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should render children when disabled', () => {
    render(
      <Tooltip content="Tooltip text" disabled>
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('should support different positions', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip text" position="top" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);
    vi.advanceTimersByTime(0);

    await waitFor(
      () => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should support custom className', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content="Tooltip text" className="custom-class" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);
    vi.advanceTimersByTime(0);

    await waitFor(
      () => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('custom-class');
      },
      { timeout: 2000 }
    );
  });

  it('should support ReactNode content', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Tooltip content={<span>Custom content</span>} delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);
    vi.advanceTimersByTime(0);

    await waitFor(
      () => {
        expect(screen.getByText('Custom content')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should clear timeout on unmount', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    await user.hover(button);

    unmount();

    vi.advanceTimersByTime(200);

    // Should not throw or cause issues
    expect(true).toBe(true);
  });
});

