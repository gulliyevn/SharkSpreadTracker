import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BackendStatus } from '../BackendStatus';
import { backendHealthMonitor } from '@/utils/backend-health';
import { API_MODE } from '@/api/adapters/api-adapter';

// Мокируем backend-health
vi.mock('@/utils/backend-health', () => ({
  backendHealthMonitor: {
    subscribe: vi.fn((callback) => {
      callback('unknown');
      return () => {}; // unsubscribe function
    }),
    getStatus: vi.fn(() => 'unknown'),
    getLastCheck: vi.fn(() => null),
  },
}));

const mockApiMode = vi.fn(() => 'hybrid');
vi.mock('@/api/adapters/api-adapter', () => ({
  get API_MODE() {
    return mockApiMode();
  },
}));

describe('BackendStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiMode.mockReturnValue('hybrid');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render when API_MODE is not direct', () => {
    render(<BackendStatus />);
    expect(screen.getByLabelText(/Backend status/i)).toBeInTheDocument();
  });

  it('should display unknown status initially', () => {
    render(<BackendStatus />);
    expect(screen.getByText(/Checking.../i)).toBeInTheDocument();
  });

  it('should display healthy status', async () => {
    vi.mocked(backendHealthMonitor.subscribe).mockImplementation((callback) => {
      callback('healthy');
      return () => {};
    });
    vi.mocked(backendHealthMonitor.getStatus).mockReturnValue('healthy');

    render(<BackendStatus />);

    await waitFor(() => {
      expect(screen.getByText(/Backend Online/i)).toBeInTheDocument();
    });
  });

  it('should display unhealthy status', async () => {
    vi.mocked(backendHealthMonitor.subscribe).mockImplementation((callback) => {
      callback('unhealthy');
      return () => {};
    });
    vi.mocked(backendHealthMonitor.getStatus).mockReturnValue('unhealthy');

    render(<BackendStatus />);

    await waitFor(() => {
      expect(screen.getByText(/Backend Offline/i)).toBeInTheDocument();
    });
  });

  it('should subscribe to status changes', () => {
    render(<BackendStatus />);
    expect(backendHealthMonitor.subscribe).toHaveBeenCalled();
  });

  it('should unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    vi.mocked(backendHealthMonitor.subscribe).mockReturnValue(unsubscribe);

    const { unmount } = render(<BackendStatus />);
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should display last check time when available', async () => {
    const lastCheck = Date.now();
    vi.mocked(backendHealthMonitor.getLastCheck).mockReturnValue(lastCheck);
    vi.mocked(backendHealthMonitor.subscribe).mockImplementation((callback) => {
      callback('healthy');
      return () => {};
    });
    vi.mocked(backendHealthMonitor.getStatus).mockReturnValue('healthy');

    render(<BackendStatus />);

    const statusElement = screen.getByLabelText(/Backend status/i);
    expect(statusElement).toHaveAttribute('title');
  });

  it('should not render when API_MODE is direct', () => {
    mockApiMode.mockReturnValue('direct');

    const { container } = render(<BackendStatus />);
    
    // Когда API_MODE = direct, компонент должен вернуть null
    expect(container.firstChild).toBeNull();
    
    // Восстанавливаем мок
    mockApiMode.mockReturnValue('hybrid');
  });
});

