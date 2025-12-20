import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChainFilter } from '../ChainFilter';

describe('ChainFilter', () => {
  it('should render all filter buttons', () => {
    const onChange = vi.fn();
    render(<ChainFilter value="all" onChange={onChange} />);

    expect(screen.getByText(/^All/)).toBeInTheDocument();
    expect(screen.getByText(/^BSC/)).toBeInTheDocument();
    expect(screen.getByText(/^SOL/)).toBeInTheDocument();
  });

  it('should call onChange when All button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChainFilter value="bsc" onChange={onChange} />);

    const allButton = screen.getByText(/^All/);
    await user.click(allButton);

    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('should call onChange when BSC button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChainFilter value="all" onChange={onChange} />);

    const bscButton = screen.getByText(/^BSC/);
    await user.click(bscButton);

    expect(onChange).toHaveBeenCalledWith('bsc');
  });

  it('should call onChange when SOL button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChainFilter value="all" onChange={onChange} />);

    const solButton = screen.getByText(/^SOL/);
    await user.click(solButton);

    expect(onChange).toHaveBeenCalledWith('solana');
  });

  it('should display counts when provided', () => {
    const onChange = vi.fn();
    const counts = {
      all: 100,
      solana: 50,
      bsc: 50,
    };

    render(<ChainFilter value="all" onChange={onChange} counts={counts} />);

    expect(screen.getByText(/All \(100\)/)).toBeInTheDocument();
    expect(screen.getByText(/BSC \(50\)/)).toBeInTheDocument();
    expect(screen.getByText(/SOL \(50\)/)).toBeInTheDocument();
  });

  it('should highlight active filter', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ChainFilter value="all" onChange={onChange} />
    );

    const allButton = screen.getByText(/^All/).closest('button');
    expect(allButton).toHaveClass('bg-primary-600');

    rerender(<ChainFilter value="bsc" onChange={onChange} />);
    const bscButton = screen.getByText(/^BSC/).closest('button');
    expect(bscButton).toHaveClass('bg-primary-600');

    rerender(<ChainFilter value="solana" onChange={onChange} />);
    const solButton = screen.getByText(/^SOL/).closest('button');
    expect(solButton).toHaveClass('bg-primary-600');
  });

  it('should have correct aria attributes', () => {
    const onChange = vi.fn();
    render(<ChainFilter value="all" onChange={onChange} />);

    const allButton = screen.getByLabelText('Show all tokens');
    expect(allButton).toHaveAttribute('aria-pressed', 'true');

    const bscButton = screen.getByLabelText('Show BSC tokens');
    expect(bscButton).toHaveAttribute('aria-pressed', 'false');
  });
});
