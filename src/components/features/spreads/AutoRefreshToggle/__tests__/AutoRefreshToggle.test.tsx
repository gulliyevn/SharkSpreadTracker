import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutoRefreshToggle } from '../AutoRefreshToggle';

describe('AutoRefreshToggle', () => {
  it('should render Auto and Refresh buttons', () => {
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <AutoRefreshToggle
        isAuto={true}
        onToggle={onToggle}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should highlight Auto button when isAuto is true', () => {
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <AutoRefreshToggle
        isAuto={true}
        onToggle={onToggle}
        onRefresh={onRefresh}
      />
    );

    const autoButton = screen.getByText('Auto').closest('button');
    expect(autoButton).toBeInTheDocument();
    // Проверяем что кнопка имеет primary стиль (bg-primary-500 или variant="primary")
    expect(autoButton?.className).toMatch(/primary|bg-primary/);
  });

  it('should not highlight Auto button when isAuto is false', () => {
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <AutoRefreshToggle
        isAuto={false}
        onToggle={onToggle}
        onRefresh={onRefresh}
      />
    );

    const autoButton = screen.getByText('Auto').closest('button');
    expect(autoButton).not.toHaveClass('bg-primary-500');
  });

  it('should call onToggle when Auto button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <AutoRefreshToggle
        isAuto={true}
        onToggle={onToggle}
        onRefresh={onRefresh}
      />
    );

    const autoButton = screen.getByText('Auto').closest('button');
    if (autoButton) {
      await user.click(autoButton);
      expect(onToggle).toHaveBeenCalledWith(false);
    }
  });

  it('should call onRefresh when Refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <AutoRefreshToggle
        isAuto={true}
        onToggle={onToggle}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByText('Refresh').closest('button');
    if (refreshButton) {
      await user.click(refreshButton);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    }
  });
});
