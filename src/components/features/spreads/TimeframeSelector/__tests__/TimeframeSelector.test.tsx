import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TimeframeSelector } from '../TimeframeSelector';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <LanguageProvider>{children}</LanguageProvider>;
};

describe('TimeframeSelector', () => {
  it('should render all timeframe buttons', () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TimeframeSelector value="1h" onChange={onChange} />
      </TestWrapper>
    );

    // Текст отображается через i18n: "1m" -> "1M", "5m" -> "5M" и т.д.
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('5M')).toBeInTheDocument();
    expect(screen.getByText('15M')).toBeInTheDocument();
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('4H')).toBeInTheDocument();
    expect(screen.getByText('1D')).toBeInTheDocument();
  });

  it('should highlight selected timeframe', () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TimeframeSelector value="1h" onChange={onChange} />
      </TestWrapper>
    );

    // Текст отображается через i18n: "1h" -> "1H"
    const selectedButton = screen.getByText('1H').closest('button');
    expect(selectedButton).toHaveClass('bg-primary-500');
  });

  it('should call onChange when timeframe is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <TimeframeSelector value="1h" onChange={onChange} />
      </TestWrapper>
    );

    // Текст отображается через i18n: "5m" -> "5M"
    const button5m = screen.getByText('5M').closest('button');
    if (button5m) {
      await user.click(button5m);
      expect(onChange).toHaveBeenCalledWith('5m');
    }
  });

  it('should apply custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <TestWrapper>
        <TimeframeSelector
          value="1h"
          onChange={onChange}
          className="custom-class"
        />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
