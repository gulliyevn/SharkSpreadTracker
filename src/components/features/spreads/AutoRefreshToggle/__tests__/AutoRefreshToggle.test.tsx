import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutoRefreshToggle } from '../AutoRefreshToggle';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <LanguageProvider>{children}</LanguageProvider>;
};

describe('AutoRefreshToggle', () => {
  it('should render Auto and Refresh buttons', () => {
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <TestWrapper>
        <AutoRefreshToggle
          isAuto={true}
          onToggle={onToggle}
          onRefresh={onRefresh}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should highlight Auto button when isAuto is true', () => {
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <TestWrapper>
        <AutoRefreshToggle
          isAuto={true}
          onToggle={onToggle}
          onRefresh={onRefresh}
        />
      </TestWrapper>
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
      <TestWrapper>
        <AutoRefreshToggle
          isAuto={false}
          onToggle={onToggle}
          onRefresh={onRefresh}
        />
      </TestWrapper>
    );

    const autoButton = screen.getByText('Auto').closest('button');
    expect(autoButton).toBeInTheDocument();
    // Проверяем что кнопка не имеет primary стиль при isAuto=false
    expect(autoButton?.className).not.toMatch(/bg-primary-500/);
  });

  it('should call onToggle when Auto button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onRefresh = vi.fn();
    render(
      <TestWrapper>
        <AutoRefreshToggle
          isAuto={true}
          onToggle={onToggle}
          onRefresh={onRefresh}
        />
      </TestWrapper>
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
      <TestWrapper>
        <AutoRefreshToggle
          isAuto={true}
          onToggle={onToggle}
          onRefresh={onRefresh}
        />
      </TestWrapper>
    );

    const refreshButton = screen.getByText('Refresh').closest('button');
    if (refreshButton) {
      await user.click(refreshButton);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    }
  });
});
