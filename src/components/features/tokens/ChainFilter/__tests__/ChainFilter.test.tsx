import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChainFilter } from '../ChainFilter';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <LanguageProvider>{children}</LanguageProvider>;
};

describe('ChainFilter', () => {
  it('should render all filter buttons', () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <ChainFilter value="all" onChange={onChange} />
      </TestWrapper>
    );

    expect(screen.getByText(/^All/)).toBeInTheDocument();
    expect(screen.getByText(/^BSC/)).toBeInTheDocument();
    expect(screen.getByText(/^SOL/)).toBeInTheDocument();
  });

  it('should call onChange when All button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <ChainFilter value="bsc" onChange={onChange} />
      </TestWrapper>
    );

    const allButton = screen.getByText(/^All/);
    await user.click(allButton);

    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('should call onChange when BSC button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <ChainFilter value="all" onChange={onChange} />
      </TestWrapper>
    );

    const bscButton = screen.getByText(/^BSC/);
    await user.click(bscButton);

    expect(onChange).toHaveBeenCalledWith('bsc');
  });

  it('should call onChange when SOL button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <ChainFilter value="all" onChange={onChange} />
      </TestWrapper>
    );

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

    render(
      <TestWrapper>
        <ChainFilter value="all" onChange={onChange} counts={counts} />
      </TestWrapper>
    );

    // Компонент показывает только текущий активный фильтр с его счетом
    expect(screen.getByText(/All \(100\)/)).toBeInTheDocument();
    
    // Проверяем другие значения через rerender
    const { rerender } = render(
      <TestWrapper>
        <ChainFilter value="bsc" onChange={onChange} counts={counts} />
      </TestWrapper>
    );
    expect(screen.getByText(/BSC \(50\)/)).toBeInTheDocument();
    
    rerender(
      <TestWrapper>
        <ChainFilter value="solana" onChange={onChange} counts={counts} />
      </TestWrapper>
    );
    expect(screen.getByText(/SOL \(50\)/)).toBeInTheDocument();
  });

  it('should highlight active filter', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TestWrapper>
        <ChainFilter value="all" onChange={onChange} />
      </TestWrapper>
    );

    const allButton = screen.getByText(/^All/).closest('button');
    expect(allButton).toHaveClass('bg-primary-600');

    rerender(
      <TestWrapper>
        <ChainFilter value="bsc" onChange={onChange} />
      </TestWrapper>
    );
    const bscButton = screen.getByText(/^BSC/).closest('button');
    expect(bscButton).toHaveClass('bg-primary-600');

    rerender(
      <TestWrapper>
        <ChainFilter value="solana" onChange={onChange} />
      </TestWrapper>
    );
    const solButton = screen.getByText(/^SOL/).closest('button');
    expect(solButton).toHaveClass('bg-primary-600');
  });

  it('should have correct aria attributes', () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <ChainFilter value="all" onChange={onChange} />
      </TestWrapper>
    );

    const allButton = screen.getByLabelText('Show all tokens, click to filter by SOL');
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });
});
