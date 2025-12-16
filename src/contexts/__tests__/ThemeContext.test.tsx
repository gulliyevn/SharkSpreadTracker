import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Мокаем useLocalStorage
vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(),
}));

// Мокаем matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Сбрасываем классы на documentElement
    document.documentElement.classList.remove('dark', 'light');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark', 'light');
  });

  describe('ThemeProvider', () => {
    it('should provide default theme', () => {
      vi.mocked(useLocalStorage).mockReturnValue(['system', vi.fn()]);
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should apply light theme when stored theme is light', () => {
      const setStoredTheme = vi.fn();
      vi.mocked(useLocalStorage).mockReturnValue(['light', setStoredTheme]);
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('should apply dark theme when stored theme is dark', () => {
      const setStoredTheme = vi.fn();
      vi.mocked(useLocalStorage).mockReturnValue(['dark', setStoredTheme]);
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should use system theme when stored theme is system', () => {
      const setStoredTheme = vi.fn();
      vi.mocked(useLocalStorage).mockReturnValue(['system', setStoredTheme]);
      mockMatchMedia.mockReturnValue({
        matches: true, // dark mode
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should update theme when setTheme is called', () => {
      const setStoredTheme = vi.fn();
      vi.mocked(useLocalStorage).mockReturnValue(['light', setStoredTheme]);
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(setStoredTheme).toHaveBeenCalledWith('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should throw error when useTheme is used outside provider', () => {
      // Подавляем console.error для этого теста
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});

