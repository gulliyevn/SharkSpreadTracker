import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCSRFToken, validateCSRFToken } from '../csrf';

// Мокаем sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('csrf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  describe('getCSRFToken', () => {
    it('should generate new token if not exists', () => {
      const token = getCSRFToken();
      expect(token).toBeTruthy();
      expect(token.length).toBe(64); // 32 bytes * 2 hex chars
    });

    it('should return existing token from sessionStorage', () => {
      const firstToken = getCSRFToken();
      const secondToken = getCSRFToken();
      expect(firstToken).toBe(secondToken);
    });

    it('should return empty string in non-browser environment', () => {
      const originalWindow = global.window;
      // @ts-expect-error - временно удаляем window для теста
      delete global.window;

      const token = getCSRFToken();
      expect(token).toBe('');

      global.window = originalWindow;
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate correct token', () => {
      const token = getCSRFToken();
      expect(validateCSRFToken(token)).toBe(true);
    });

    it('should reject incorrect token', () => {
      getCSRFToken(); // Создаём токен
      expect(validateCSRFToken('wrong-token')).toBe(false);
    });

    it('should reject when no token exists', () => {
      mockSessionStorage.clear();
      expect(validateCSRFToken('any-token')).toBe(false);
    });

    it('should return false in non-browser environment', () => {
      const originalWindow = global.window;
      // @ts-expect-error - временно удаляем window для теста
      delete global.window;

      expect(validateCSRFToken('any-token')).toBe(false);

      global.window = originalWindow;
    });
  });
});
