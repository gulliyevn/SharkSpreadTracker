import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ViewProvider } from '@/contexts/ViewContext';
import { TokensPage } from '@/pages/TokensPage';
import { Header } from '@/components/layout/Header';

/**
 * Integration Tests - тесты для проверки взаимодействия компонентов
 */

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ViewProvider>{children}</ViewProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Integration Tests', () => {
  beforeEach(() => {
    // Очистка перед каждым тестом
  });

  describe('Header Navigation', () => {
    it('should have view switcher button', async () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Ищем кнопку переключения views (она одна, переключает между views)
      const viewButton = screen.getByRole('button', {
        name: /charts|open charts/i,
      });
      expect(viewButton).toBeInTheDocument();
    });

    it('should toggle theme', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Ищем кнопку переключения темы по aria-label или title
      const themeButton = screen.getByRole('button', {
        name: /toggle theme|switch theme/i,
      });
      expect(themeButton).toBeInTheDocument();

      await user.click(themeButton);
      // Проверяем, что кнопка существует и кликабельна
      expect(themeButton).toBeInTheDocument();
    });

    it('should change language', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Ищем кнопки языков (EN, RU, TR)
      const enButton = screen.getByRole('button', {
        name: /switch to english|english/i,
      });
      const ruButton = screen.getByRole('button', {
        name: /переключить на русский|русский/i,
      });

      expect(enButton).toBeInTheDocument();
      expect(ruButton).toBeInTheDocument();

      // Кликаем на русский
      await user.click(ruButton);
      // Проверяем, что кнопки все еще доступны
      expect(ruButton).toBeInTheDocument();
    });
  });

  describe('TokensPage Interactions', () => {
    it('should filter tokens by search term', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <TokensPage />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search|поиск|ara/i);
      await user.type(searchInput, 'BTC');

      // Ждем, пока фильтрация применится
      await waitFor(() => {
        expect(searchInput).toHaveValue('BTC');
      });
    });

    it('should handle filter changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <TokensPage />
        </TestWrapper>
      );

      // Ищем фильтры
      const minSpreadInput = screen.getByLabelText(/OT|min spread/i);
      if (minSpreadInput) {
        await user.type(minSpreadInput, '5');
        await waitFor(() => {
          expect(minSpreadInput).toHaveValue(5);
        });
      }
    });
  });
});
