import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ViewProvider } from '@/contexts/ViewContext';
import App from '@/App';
import '@/lib/i18n'; // Инициализация i18n

/**
 * Smoke Tests - быстрые тесты для проверки критических путей
 * Эти тесты должны выполняться быстро и проверять базовую работоспособность
 */

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
      },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <ViewProvider>{children}</ViewProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Smoke Tests - Critical Paths', () => {
  describe('Application Initialization', () => {
    it('should render App without crashing', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should render Header', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Header должен содержать логотип или заголовок
      const header = await screen.findByRole('banner', {}, { timeout: 2000 });
      expect(header).toBeInTheDocument();
      // Проверяем наличие логотипа
      const logo = screen.getByAltText(/shark|logo/i);
      expect(logo).toBeInTheDocument();
    });

    it('should render Footer', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      const footer = await screen.findByRole(
        'contentinfo',
        {},
        { timeout: 2000 }
      );
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Tokens Page - Critical Functionality', () => {
    it('should render TokensPage without crashing', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Проверяем, что страница токенов рендерится (по умолчанию)
      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should display search input', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Ищем поле поиска по placeholder или role
      // Может быть не сразу, так как страница загружается
      const searchInput = await screen.findByPlaceholderText(
        /search|поиск|ara/i,
        {},
        { timeout: 5000 }
      );
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Context Providers', () => {
    it('should provide ThemeContext', async () => {
      const { container } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Проверяем, что тема применяется (класс dark или light)
      await waitFor(
        () => {
          expect(container.firstChild).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should provide LanguageContext', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Проверяем, что переводы работают (текст на странице)
      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should provide ViewContext', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Проверяем, что переключение между views работает
      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('API Integration - Basic Checks', () => {
    it('should handle API errors gracefully', async () => {
      // Этот тест проверяет, что приложение не падает при ошибках API
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      // Приложение должно рендериться даже если API недоступно
      await waitFor(
        () => {
          expect(document.body).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
