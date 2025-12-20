import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeysWarning } from '../ApiKeysWarning';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/lib/i18n';

// Мокируем утилиты для работы с API ключами
vi.mock('@/utils/api-keys-validator', () => ({
  getApiKeysStatusMessage: vi.fn(() => ({
    hasWarnings: true,
    message: 'Some API keys are missing',
  })),
  getMissingApiKeys: vi.fn(() => ['VITE_JUPITER_API_KEY']),
  getInvalidApiKeys: vi.fn(() => []),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('ApiKeysWarning', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render warning when API keys have warnings', async () => {
    render(
      <TestWrapper>
        <ApiKeysWarning />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/API Keys Warning/i)).toBeInTheDocument();
    });
  });

  it('should display missing API keys', async () => {
    render(
      <TestWrapper>
        <ApiKeysWarning />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Missing keys/i)).toBeInTheDocument();
      expect(screen.getByText(/VITE_JUPITER_API_KEY/i)).toBeInTheDocument();
    });
  });

  it('should display invalid API keys', async () => {
    const { getInvalidApiKeys } = await import('@/utils/api-keys-validator');
    vi.mocked(getInvalidApiKeys).mockReturnValue(['VITE_MEXC_API_KEY']);

    render(
      <TestWrapper>
        <ApiKeysWarning />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invalid keys/i)).toBeInTheDocument();
      expect(screen.getByText(/VITE_MEXC_API_KEY/i)).toBeInTheDocument();
    });
  });

  it('should not render when dismissed', async () => {
    localStorage.setItem('api-keys-warning-dismissed', 'true');

    render(
      <TestWrapper>
        <ApiKeysWarning />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/API Keys Warning/i)).not.toBeInTheDocument();
    });
  });

  it('should dismiss warning on close button click', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ApiKeysWarning />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/API Keys Warning/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/API Keys Warning/i)).not.toBeInTheDocument();
      expect(localStorage.getItem('api-keys-warning-dismissed')).toBe('true');
    });
  });

  it('should not render when no warnings', async () => {
    const { getApiKeysStatusMessage } = await import('@/utils/api-keys-validator');
    vi.mocked(getApiKeysStatusMessage).mockReturnValue({
      hasWarnings: false,
      message: 'All keys are valid',
    });

    render(
      <TestWrapper>
        <ApiKeysWarning />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/API Keys Warning/i)).not.toBeInTheDocument();
    });
  });
});

