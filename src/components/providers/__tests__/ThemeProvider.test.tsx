import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '@/contexts/ThemeContext';

function TestComponent() {
  const { theme } = useTheme();
  return <div data-testid="theme">{theme}</div>;
}

describe('ThemeProvider', () => {
  it('should render children', () => {
    render(
      <ThemeProvider>
        <div>Test content</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should provide theme context', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const themeElement = screen.getByTestId('theme');
    expect(themeElement).toBeInTheDocument();
    // Theme может быть 'light', 'dark' или 'system'
    expect(['light', 'dark', 'system']).toContain(themeElement.textContent);
  });
});
