import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeframeSelector } from '../TimeframeSelector';

describe('TimeframeSelector', () => {
  it('should render all timeframe buttons', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    expect(screen.getByText('1m')).toBeInTheDocument();
    expect(screen.getByText('5m')).toBeInTheDocument();
    expect(screen.getByText('15m')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
  });

  it('should highlight selected timeframe', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    const selectedButton = screen.getByText('1h').closest('button');
    expect(selectedButton).toHaveClass('bg-primary-500');
  });

  it('should call onChange when timeframe is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    const button5m = screen.getByText('5m').closest('button');
    if (button5m) {
      await user.click(button5m);
      expect(onChange).toHaveBeenCalledWith('5m');
    }
  });

  it('should apply custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimeframeSelector
        value="1h"
        onChange={onChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
