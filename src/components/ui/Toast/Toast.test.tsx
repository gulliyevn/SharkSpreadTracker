import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';
import type { Toast as ToastType } from '@/contexts/ToastContext';

const mockToast: ToastType = {
  id: '1',
  message: 'Test message',
  type: 'info',
};

describe('Toast', () => {
  it('should render toast message', () => {
    render(<Toast toast={mockToast} onClose={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success toast', () => {
    const successToast: ToastType = { ...mockToast, type: 'success' };
    render(<Toast toast={successToast} onClose={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render error toast', () => {
    const errorToast: ToastType = { ...mockToast, type: 'error' };
    render(<Toast toast={errorToast} onClose={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast toast={mockToast} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close notification');
    closeButton.click();
    
    expect(onClose).toHaveBeenCalledWith('1');
  });
});

