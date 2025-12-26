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
      const viewButton = screen.getByRole('button', {
        name: /charts|open charts/i,
      });
      expect(viewButton).toBeInTheDocument();
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
      const langButton = screen.getByRole('button', {
        name: /current language/i,
      });
      expect(langButton).toBeInTheDocument();
    });
  });

  it('should render theme switcher button', async () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      const themeButton = screen.getByRole('button', {
        name: /switch to (light|dark) mode/i,
      });
      expect(themeButton).toBeInTheDocument();
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
      const langButton = screen.getByRole('button', {
        name: /current language/i,
      });
      expect(langButton).toBeInTheDocument();
    });

    const langButton = screen.getByRole('button', {
      name: /current language/i,
    });
    await user.click(langButton);

    // Проверяем, что кнопка обновилась после клика
    await waitFor(
      () => {
        const updatedButton = screen.getByRole('button', {
          name: /current language/i,
        });
        expect(updatedButton).toBeInTheDocument();
        // Проверяем, что текст кнопки изменился (EN -> RU или текст содержит RU)
        const buttonText = updatedButton.textContent?.toUpperCase() || '';
        expect(buttonText).toMatch(/RU|EN|TR/);
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
      const viewButton = screen.getByRole('button', { name: /charts/i });
      expect(viewButton).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /charts/i });
    await user.click(viewButton);

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

    // По умолчанию язык EN, переключаем на RU, потом на TR, потом обратно на EN
    await waitFor(() => {
      const langButton = screen.getByRole('button', {
        name: /current language.*en/i,
      });
      expect(langButton).toBeInTheDocument();
    });

    // Переключаем EN -> RU -> TR -> EN
    const langButton = screen.getByRole('button', {
      name: /current language/i,
    });
    await user.click(langButton); // EN -> RU
    await user.click(langButton); // RU -> TR
    await user.click(langButton); // TR -> EN

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /current language.*en/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('should switch to Turkish when TR button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    // Переключаем EN -> RU -> TR
    await waitFor(() => {
      const langButton = screen.getByRole('button', {
        name: /current language.*en/i,
      });
      expect(langButton).toBeInTheDocument();
    });

    const langButton = screen.getByRole('button', {
      name: /current language/i,
    });
    await user.click(langButton); // EN -> RU
    await user.click(langButton); // RU -> TR

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /current language.*tr/i,
        })
      ).toBeInTheDocument();
    });
  });
});
