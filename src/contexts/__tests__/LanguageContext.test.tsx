import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Мокаем useLocalStorage
vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(),
}));

// Мокаем react-i18next
const mockChangeLanguage = vi.fn();
const mockI18n = {
  language: 'en',
  changeLanguage: mockChangeLanguage,
  isInitialized: true,
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: mockI18n,
  }),
}));

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'en';
    mockI18n.isInitialized = true;
  });

  describe('LanguageProvider', () => {
    it('should provide default language', () => {
      vi.mocked(useLocalStorage).mockReturnValue(['en', vi.fn()]);

      const { result } = renderHook(() => useLanguage(), {
        wrapper: LanguageProvider,
      });

      expect(result.current.currentLanguage).toBe('en');
      expect(result.current.isReady).toBe(true);
      expect(typeof result.current.t).toBe('function');
    });

    it('should provide stored language', () => {
      vi.mocked(useLocalStorage).mockReturnValue(['ru', vi.fn()]);
      mockI18n.language = 'ru';

      const { result } = renderHook(() => useLanguage(), {
        wrapper: LanguageProvider,
      });

      expect(result.current.currentLanguage).toBe('ru');
    });

    it('should change language when changeLanguage is called', () => {
      const setStoredLanguage = vi.fn();
      vi.mocked(useLocalStorage).mockReturnValue(['en', setStoredLanguage]);

      const { result } = renderHook(() => useLanguage(), {
        wrapper: LanguageProvider,
      });

      act(() => {
        result.current.changeLanguage('tr');
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('tr');
      expect(setStoredLanguage).toHaveBeenCalledWith('tr');
    });

    it('should sync with i18next when stored language changes', () => {
      const setStoredLanguage = vi.fn();
      vi.mocked(useLocalStorage).mockReturnValue(['en', setStoredLanguage]);
      mockI18n.language = 'en';

      renderHook(() => useLanguage(), {
        wrapper: LanguageProvider,
      });

      // Симулируем изменение storedLanguage
      vi.mocked(useLocalStorage).mockReturnValue(['ru', setStoredLanguage]);
      mockI18n.language = 'ru';

      const { result } = renderHook(() => useLanguage(), {
        wrapper: LanguageProvider,
      });

      expect(result.current.currentLanguage).toBe('ru');
    });

    it('should throw error when useLanguage is used outside provider', () => {
      // Подавляем console.error для этого теста
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within a LanguageProvider');

      consoleSpy.mockRestore();
    });
  });
});

