import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectionStatus } from '../ConnectionStatus';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import * as apiAdapter from '@/api/adapters/api-adapter';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('disconnected');
    vi.spyOn(apiAdapter, 'subscribeToConnectionStatus').mockReturnValue(
      () => {}
    );
  });

  it('should render connection status', () => {
    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    // ConnectionStatus рендерит div без role, используем querySelector или проверяем по тексту
    const container = document.querySelector('[class*="rounded-lg"]');
    expect(container).toBeInTheDocument();
  });

  it('should show label by default', () => {
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('connected');
    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/connected|подключено/i)).toBeInTheDocument();
  });

  it('should hide label when showLabel is false', () => {
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('connected');
    render(
      <TestWrapper>
        <ConnectionStatus showLabel={false} />
      </TestWrapper>
    );

    // Иконка должна быть, но текст не должен отображаться
    const container = document.querySelector('[class*="rounded-lg"]');
    expect(container).toBeInTheDocument();
    // Проверяем что нет текста "Connected"
    expect(screen.queryByText(/connected/i)).not.toBeInTheDocument();
  });

  it('should display connected state', () => {
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('connected');
    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/connected|подключено/i)).toBeInTheDocument();
  });

  it('should display connecting state', () => {
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('connecting');
    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/connecting|подключение/i)).toBeInTheDocument();
  });

  it('should display disconnected state', () => {
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('disconnected');
    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/disconnected|отключено/i)).toBeInTheDocument();
  });

  it('should display error state', () => {
    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('error');
    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/error|ошибка/i)).toBeInTheDocument();
  });

  it('should subscribe to connection status changes', () => {
    const subscribeSpy = vi.spyOn(apiAdapter, 'subscribeToConnectionStatus');
    const unsubscribe = vi.fn();
    subscribeSpy.mockReturnValue(unsubscribe);

    const { unmount } = render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(subscribeSpy).toHaveBeenCalled();

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should update when connection status changes', () => {
    let statusCallback: ((status: string) => void) | null = null;
    vi.spyOn(apiAdapter, 'subscribeToConnectionStatus').mockImplementation(
      (callback) => {
        statusCallback = callback as (status: string) => void;
        return () => {};
      }
    );

    vi.spyOn(apiAdapter, 'getConnectionStatus').mockReturnValue('disconnected');

    render(
      <TestWrapper>
        <ConnectionStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/disconnected|отключено/i)).toBeInTheDocument();

    // Симулируем изменение статуса
    if (statusCallback) {
      act(() => {
        statusCallback!('connected');
      });
    }

    expect(screen.getByText(/connected|подключено/i)).toBeInTheDocument();
  });
});
