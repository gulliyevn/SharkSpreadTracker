import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '../Progress';

describe('Progress', () => {
  it('should render progress bar with default values', () => {
    render(<Progress value={50} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should render with custom max value', () => {
    render(<Progress value={25} max={50} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should show label when showLabel is true', () => {
    render(<Progress value={75} showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should show custom label', () => {
    render(<Progress value={50} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should not show label when showLabel is false and no label provided', () => {
    render(<Progress value={50} showLabel={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { rerender, container } = render(<Progress value={50} size="sm" />);
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('h-1');

    rerender(<Progress value={50} size="md" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('h-2');

    rerender(<Progress value={50} size="lg" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('h-3');
  });

  it('should render with different variants', () => {
    const { rerender } = render(<Progress value={50} variant="primary" />);
    let fill = screen.getByRole('progressbar').querySelector('div[style*="width"]');
    expect(fill).toHaveClass('bg-primary-600');

    rerender(<Progress value={50} variant="success" />);
    fill = screen.getByRole('progressbar').querySelector('div[style*="width"]');
    expect(fill).toHaveClass('bg-success-600');

    rerender(<Progress value={50} variant="warning" />);
    fill = screen.getByRole('progressbar').querySelector('div[style*="width"]');
    expect(fill).toHaveClass('bg-warning-600');

    rerender(<Progress value={50} variant="error" />);
    fill = screen.getByRole('progressbar').querySelector('div[style*="width"]');
    expect(fill).toHaveClass('bg-error-600');
  });

  it('should clamp value to 0-100 range', () => {
    const { rerender } = render(<Progress value={-10} />);
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    rerender(<Progress value={150} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should apply custom className', () => {
    const { container } = render(<Progress value={50} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should calculate percentage correctly with custom max', () => {
    render(<Progress value={30} max={60} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    render(<Progress value={75} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Progress: 75%');
  });

  it('should use custom label in aria-label when provided', () => {
    render(<Progress value={50} label="Loading data..." />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Loading data...');
  });
});

