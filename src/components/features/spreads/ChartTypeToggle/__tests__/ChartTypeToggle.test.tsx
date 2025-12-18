import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartTypeToggle } from '../ChartTypeToggle';

describe('ChartTypeToggle', () => {
  it('should render all chart type buttons', () => {
    const onChange = vi.fn();
    render(<ChartTypeToggle value="spread" onChange={onChange} />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Prices')).toBeInTheDocument();
    expect(screen.getByText('Spread')).toBeInTheDocument();
  });

  it('should highlight selected chart type', () => {
    const onChange = vi.fn();
    render(<ChartTypeToggle value="spread" onChange={onChange} />);

    const selectedButton = screen.getByText('Spread').closest('button');
    expect(selectedButton).toHaveClass('bg-primary-500');
  });

  it('should call onChange when chart type is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChartTypeToggle value="spread" onChange={onChange} />);

    const allButton = screen.getByText('All').closest('button');
    if (allButton) {
      await user.click(allButton);
      expect(onChange).toHaveBeenCalledWith('all');
    }
  });

  it('should apply custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ChartTypeToggle
        value="spread"
        onChange={onChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
