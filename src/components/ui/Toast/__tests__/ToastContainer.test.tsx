import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from '../ToastContainer';
import { useToast } from '@/contexts/ToastContext';

vi.mock('@/contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

const mockedUseToast = vi.mocked(useToast);

describe('ToastContainer', () => {
  it('should render nothing when no toasts', () => {
    mockedUseToast.mockReturnValue({
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.queryByLabelText('Notifications')).not.toBeInTheDocument();
  });

  it('should render toasts when they exist', () => {
    mockedUseToast.mockReturnValue({
      toasts: [
        { id: '1', message: 'Test message', type: 'info' },
        { id: '2', message: 'Another message', type: 'success' },
      ],
      showToast: vi.fn(),
      removeToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    });

    render(<ToastContainer />);

    const container = screen.getByLabelText('Notifications');
    expect(container).toBeInTheDocument();
  });

  it('should have correct ARIA attributes', () => {
    mockedUseToast.mockReturnValue({
      toasts: [{ id: '1', message: 'Test', type: 'info' }],
      showToast: vi.fn(),
      removeToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    });

    render(<ToastContainer />);

    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });
});
