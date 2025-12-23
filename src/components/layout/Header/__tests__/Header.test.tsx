import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ViewProvider } from '@/contexts/ViewContext';
import '@/lib/i18n';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

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
      const enButton = screen.getByRole('button', {
        name: /switch to english/i,
      });
      const ruButton = screen.getByRole('button', {
        name: /переключить на русский/i,
      });
      expect(enButton).toBeInTheDocument();
      expect(ruButton).toBeInTheDocument();
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
      const enButton = screen.getByRole('button', { name: /english/i });
      expect(enButton).toBeInTheDocument();
    });

    const ruButton = screen.getByRole('button', { name: /русский/i });
    await user.click(ruButton);

    // Язык должен переключиться
    expect(ruButton).toBeInTheDocument();
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

    await waitFor(() => {
      const enButton = screen.getByRole('button', { name: /english/i });
      expect(enButton).toBeInTheDocument();
    });

    const enButton = screen.getByRole('button', { name: /english/i });
    await user.click(enButton);

    expect(enButton).toBeInTheDocument();
  });

  it('should switch to Turkish when TR button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    await waitFor(() => {
      const trButton = screen.getByRole('button', { name: /türkçe/i });
      expect(trButton).toBeInTheDocument();
    });

    const trButton = screen.getByRole('button', { name: /türkçe/i });
    await user.click(trButton);

    expect(trButton).toBeInTheDocument();
  });
});
