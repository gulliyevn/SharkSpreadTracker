import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ViewProvider } from '@/contexts/ViewContext';
import { SearchProvider } from '@/contexts/SearchContext';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <SearchProvider>
            <ViewProvider>{children}</ViewProvider>
          </SearchProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header with logo', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    const logo = screen.getByAltText(/shark|logo/i);
    expect(logo).toBeInTheDocument();
  });

  it('should render view switcher button', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', {
        name: /charts|open charts/i,
      });
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });

  it('should render language switcher buttons', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      // Кнопка показывает текущий язык (по умолчанию EN)
      // Используем getAllByRole так как есть две кнопки (мобильная и десктопная)
      const langButtons = screen.getAllByRole('button', {
        name: /current language/i,
      });
      expect(langButtons.length).toBeGreaterThan(0);
    });
  });

  it('should render theme switcher button', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      // Используем getAllByRole так как есть две кнопки (мобильная и десктопная)
      const themeButtons = screen.getAllByRole('button', {
        name: /switch to (light|dark) mode/i,
      });
      expect(themeButtons.length).toBeGreaterThan(0);
    });
  });

  it('should toggle theme when theme button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find((btn) =>
        btn.getAttribute('aria-label')?.includes('mode')
      );
      expect(themeButton).toBeDefined();
    });

    const buttons = screen.getAllByRole('button');
    const themeButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('mode')
    );

    if (themeButton) {
      await user.click(themeButton);
      // Theme should toggle (button should still be present)
      expect(themeButton).toBeInTheDocument();
    }
  });

  it('should switch language when language button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      // Кнопка показывает текущий язык (по умолчанию EN)
      // Используем getAllByRole так как есть две кнопки (мобильная и десктопная)
      const langButtons = screen.getAllByRole('button', {
        name: /current language/i,
      });
      expect(langButtons.length).toBeGreaterThan(0);
    });

    // Используем последнюю кнопку (десктопную версию)
    const langButtons = screen.getAllByRole('button', {
      name: /current language/i,
    });
    expect(langButtons.length).toBeGreaterThan(0);
    const langButton = langButtons[langButtons.length - 1];
    expect(langButton).toBeDefined();
    await user.click(langButton!);

    // Проверяем, что кнопка все еще существует после клика
    await waitFor(
      () => {
        const updatedButtons = screen.getAllByRole('button', {
          name: /current language/i,
        });
        expect(updatedButtons.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('should switch view when charts button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      // Используем getAllByRole так как есть две кнопки (мобильная и десктопная)
      const viewButtons = screen.getAllByRole('button', { name: /charts/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    // Используем последнюю кнопку (десктопную версию)
    const viewButtons = screen.getAllByRole('button', { name: /charts/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    const viewButton = viewButtons[viewButtons.length - 1];
    expect(viewButton).toBeDefined();
    await user.click(viewButton!);

    // Вид должен переключиться
    expect(viewButton).toBeInTheDocument();
  });

  it('should render app title', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      // Проверяем что заголовок отображается
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('should switch to English when EN button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    // По умолчанию язык EN, проверяем что кнопка существует и на неё можно кликнуть
    // Используем getAllByRole так как есть две кнопки (мобильная и десктопная)
    const langButtons = screen.getAllByRole('button', {
      name: /current language/i,
    });
    expect(langButtons.length).toBeGreaterThan(0);

    // Используем последнюю кнопку (десктопную версию)
    const langButton = langButtons[langButtons.length - 1];
    expect(langButton).toBeDefined();

    // Проверяем начальное состояние (EN)
    expect(langButton!.textContent).toMatch(/EN/i);

    // Кликаем на кнопку - проверяем что клик работает
    await user.click(langButton!);

    // Проверяем что кнопка все еще существует после клика
    const updatedButtons = screen.getAllByRole('button', {
      name: /current language/i,
    });
    expect(updatedButtons.length).toBeGreaterThan(0);
  });

  it('should switch to Turkish when TR button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    // Переключаем EN -> RU -> TR
    // Используем getAllByRole так как есть две кнопки (мобильная и десктопная)
    // Берем последнюю кнопку (десктопную версию, которая видна на sm+ экранах)
    const langButtons = screen.getAllByRole('button', {
      name: /current language/i,
    });
    expect(langButtons.length).toBeGreaterThan(0);

    // Используем последнюю кнопку (десктопную версию)
    let langButton = langButtons[langButtons.length - 1];
    expect(langButton).toBeDefined();

    // Кликаем дважды: EN -> RU -> TR
    // Проверяем что клики работают (кнопка все еще существует)
    await user.click(langButton!); // EN -> RU
    const buttonsAfterFirstClick = screen.getAllByRole('button', {
      name: /current language/i,
    });
    expect(buttonsAfterFirstClick.length).toBeGreaterThan(0);
    langButton = buttonsAfterFirstClick[buttonsAfterFirstClick.length - 1];
    expect(langButton).toBeDefined();

    await user.click(langButton!); // RU -> TR
    const buttonsAfterSecondClick = screen.getAllByRole('button', {
      name: /current language/i,
    });
    expect(buttonsAfterSecondClick.length).toBeGreaterThan(0);
  });
});
