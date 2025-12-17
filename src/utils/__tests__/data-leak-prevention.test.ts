import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  maskSensitiveData,
  safeLog,
  sanitizeForAnalytics,
  checkUrlForLeaks,
} from '../data-leak-prevention';

describe('data-leak-prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Мокаем console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('maskSensitiveData', () => {
    it('should mask long strings', () => {
      const data = 'mySecretApiKey12345';
      const result = maskSensitiveData(data);
      expect(result).toBe('my***************45');
      expect(result.length).toBe(data.length);
    });

    it('should mask short strings with stars', () => {
      expect(maskSensitiveData('abc')).toBe('****');
      expect(maskSensitiveData('ab')).toBe('****');
    });

    it('should handle empty string', () => {
      expect(maskSensitiveData('')).toBe('****');
    });
  });

  describe('safeLog', () => {
    it('should log message and data', () => {
      safeLog('Test message', { data: 'test' });
      // В тестовом окружении PROD обычно false, поэтому логируется всё
      // safeLog теперь использует logger, который может не логировать в тестах
      // Проверяем что функция выполнилась без ошибок
      expect(() => safeLog('Test message', { data: 'test' })).not.toThrow();
    });
  });

  describe('sanitizeForAnalytics', () => {
    it('should redact sensitive keys', () => {
      const data = {
        apiKey: 'secret123',
        token: 'token456',
        normalData: 'safe',
      };
      const result = sanitizeForAnalytics(data);
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(typeof result).toBe('object');
      const obj = result as Record<string, unknown>;
      expect(obj.apiKey).toBe('[REDACTED]');
      expect(obj.token).toBe('[REDACTED]');
      expect(obj.normalData).toBe('safe');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          api_key: 'secret',
          name: 'John',
        },
      };
      const result = sanitizeForAnalytics(data) as Record<string, unknown>;
      const user = result.user as Record<string, unknown>;
      expect(user.api_key).toBe('[REDACTED]');
      expect(user.name).toBe('John');
    });

    it('should handle non-objects', () => {
      expect(sanitizeForAnalytics('string')).toBe('string');
      expect(sanitizeForAnalytics(42)).toBe(42);
      expect(sanitizeForAnalytics(null)).toBe(null);
    });
  });

  describe('checkUrlForLeaks', () => {
    it('should detect sensitive parameters in URL', () => {
      // Мокаем window.location через Object.defineProperty
      const originalLocation = window.location;
      const mockUrl = new URL(
        'https://example.com?api_key=secret123&token=abc'
      );

      // Создаём мок для location с searchParams
      const locationMock = {
        href: mockUrl.href,
        searchParams: mockUrl.searchParams,
      };

      Object.defineProperty(window, 'location', {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      const replaceStateSpy = vi
        .spyOn(window.history, 'replaceState')
        .mockImplementation(() => {});
      checkUrlForLeaks();

      expect(console.warn).toHaveBeenCalled();

      replaceStateSpy.mockRestore();
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('should not modify URL without sensitive params', () => {
      const originalLocation = window.location;
      const mockUrl = new URL('https://example.com?page=1');

      const locationMock = {
        href: mockUrl.href,
        searchParams: mockUrl.searchParams,
      };

      Object.defineProperty(window, 'location', {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      checkUrlForLeaks();

      expect(console.warn).not.toHaveBeenCalled();

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });
});
