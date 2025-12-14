import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';

describe('Select', () => {
  it('should render select', () => {
    render(
      <Select>
        <option value="1">Option 1</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should call onChange when option is selected', async () => {
    const handleChange = vi.fn();
    render(
      <Select onChange={handleChange}>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '2');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should show helper text', () => {
    render(
      <Select helperText="Helper text">
        <option value="1">Option 1</option>
      </Select>
    );
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('should apply error styles when error is true', () => {
    const { container } = render(
      <Select error helperText="Error message">
        <option value="1">Option 1</option>
      </Select>
    );
    expect(container.querySelector('select')).toHaveClass('border-error-500');
    expect(screen.getByText('Error message')).toHaveClass('text-error-600');
  });
});

