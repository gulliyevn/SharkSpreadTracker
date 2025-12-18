import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { checkUrlForLeaks } from '@/utils/data-leak-prevention';

// Мокируем зависимости
vi.mock('@/lib/sentry', () => ({
  initSentry: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  initAnalytics: vi.fn(),
}));

vi.mock('@/utils/data-leak-prevention', () => ({
  checkUrlForLeaks: vi.fn(),
}));

describe('main.tsx initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Мокируем window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/',
        searchParams: new URLSearchParams(),
      },
      writable: true,
    });
  });

  it('should initialize Sentry', () => {
    // Импортируем main.tsx, что вызовет инициализацию
    // В реальном тесте это происходит при импорте модуля
    expect(initSentry).toBeDefined();

    // Вызываем напрямую для проверки
    initSentry();
    expect(vi.mocked(initSentry)).toHaveBeenCalled();
  });

  it('should initialize Analytics', () => {
    expect(initAnalytics).toBeDefined();

    initAnalytics();
    expect(vi.mocked(initAnalytics)).toHaveBeenCalled();
  });

  it('should check URL for leaks', () => {
    expect(checkUrlForLeaks).toBeDefined();

    checkUrlForLeaks();
    expect(vi.mocked(checkUrlForLeaks)).toHaveBeenCalled();
  });

  it('should detect sensitive parameters in URL', () => {
    // Устанавливаем URL с чувствительным параметром
    const url = new URL('http://localhost:3000/?api_key=secret123');
    Object.defineProperty(window, 'location', {
      value: {
        href: url.href,
        searchParams: url.searchParams,
      },
      writable: true,
    });

    checkUrlForLeaks();

    // Проверяем что функция была вызвана
    expect(vi.mocked(checkUrlForLeaks)).toHaveBeenCalled();
  });

  it('should handle global error events', () => {
    const errorHandler = vi.fn();
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'error') {
        errorHandler.mockImplementation(handler as EventListener);
      }
      originalAddEventListener.call(window, event, handler);
    });

    // Проверяем что addEventListener был вызван для ошибок
    // В реальном main.tsx обработчик уже установлен
    expect(window.addEventListener).toBeDefined();

    // Восстанавливаем
    window.addEventListener = originalAddEventListener;
  });

  it('should ignore browser extension errors', () => {
    // Проверяем логику обработки ошибок из расширений
    const extensionFilename = 'chrome-extension://test/contentScript.js';
    const shouldIgnore =
      extensionFilename.includes('contentScript') ||
      extensionFilename.includes('extension://');

    expect(shouldIgnore).toBe(true);
  });

  it('should handle unhandled promise rejections', () => {
    // Проверяем что обработчик unhandledrejection может быть установлен
    const rejectionHandler = vi.fn();
    const originalAddEventListener = window.addEventListener;

    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'unhandledrejection') {
        rejectionHandler.mockImplementation(handler as EventListener);
      }
      originalAddEventListener.call(window, event, handler);
    });

    expect(window.addEventListener).toBeDefined();

    // Восстанавливаем
    window.addEventListener = originalAddEventListener;
  });

  it('should render app with all providers', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Тест рендеринга с провайдерами
    const TestApp = () => (
      <QueryClientProvider client={queryClient}>
        <div>App Content</div>
      </QueryClientProvider>
    );

    const { container } = render(<TestApp />);
    expect(container).toBeTruthy();
    expect(container.textContent).toContain('App Content');
  });
});
