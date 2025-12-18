import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortSelector } from '../SortSelector';

describe('SortSelector', () => {
  it('should render all sort option buttons', () => {
    const onChange = vi.fn();
    render(<SortSelector value="spread" onChange={onChange} />);

    expect(screen.getByText('By Spread')).toBeInTheDocument();
    expect(screen.getByText('By Name')).toBeInTheDocument();
    expect(screen.getByText('By Price')).toBeInTheDocument();
  });

  it('should highlight selected sort option', () => {
    const onChange = vi.fn();
    render(<SortSelector value="spread" onChange={onChange} />);

    const selectedButton = screen.getByText('By Spread').closest('button');
    expect(selectedButton).toHaveClass('bg-primary-500');
  });

  it('should call onChange when sort option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortSelector value="spread" onChange={onChange} />);

    const nameButton = screen.getByText('By Name').closest('button');
    if (nameButton) {
      await user.click(nameButton);
      expect(onChange).toHaveBeenCalledWith('name');
    }
  });

  it('should apply custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SortSelector
        value="spread"
        onChange={onChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
