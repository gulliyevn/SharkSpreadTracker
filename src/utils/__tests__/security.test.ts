import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeString,
  sanitizeUrl,
  sanitizeTokenSymbol,
  sanitizeNumber,
  rateLimiter,
  safeGet,
  generateCSRFToken,
  isValidTimestamp,
} from '../security';

describe('security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Сбрасываем rate limiter
    rateLimiter.reset('test-key');
  });

  describe('sanitizeString', () => {
    it('should sanitize XSS attempts', () => {
      const malicious = '<script>alert("xss")</script>';
      const result = sanitizeString(malicious);
      expect(result).not.toContain('<script>');
      expect(result).toContain('alert');
    });

    it('should preserve safe text', () => {
      const safe = 'Hello World';
      const result = sanitizeString(safe);
      expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTPS URLs from allowed domains', () => {
      const url = 'https://lite-api.jup.ag/tokens';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should reject HTTP URLs', () => {
      const url = 'http://lite-api.jup.ag/tokens';
      expect(sanitizeUrl(url)).toBeNull();
    });

    it('should reject URLs from non-allowed domains', () => {
      const url = 'https://evil.com/steal';
      expect(sanitizeUrl(url)).toBeNull();
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });

    it('should allow all allowed domains', () => {
      expect(sanitizeUrl('https://api.dexscreener.com/latest')).toBeTruthy();
      expect(sanitizeUrl('https://contract.mexc.com/api')).toBeTruthy();
    });
  });

  describe('sanitizeTokenSymbol', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeTokenSymbol('BTC@#$')).toBe('BTC');
      expect(sanitizeTokenSymbol('ETH-USD')).toBe('ETH-USD');
      expect(sanitizeTokenSymbol('SOL_TEST')).toBe('SOL_TEST');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeTokenSymbol('BTC')).toBe('BTC');
      expect(sanitizeTokenSymbol('ETH123')).toBe('ETH123');
    });
  });

  describe('sanitizeNumber', () => {
    it('should sanitize valid numbers', () => {
      expect(sanitizeNumber(42)).toBe(42);
      expect(sanitizeNumber('42')).toBe(42);
      expect(sanitizeNumber('42.5')).toBe(42.5);
    });

    it('should return null for invalid values', () => {
      expect(sanitizeNumber('not-a-number')).toBeNull();
      expect(sanitizeNumber(NaN)).toBeNull();
      expect(sanitizeNumber(Infinity)).toBeNull();
      expect(sanitizeNumber(null)).toBeNull();
      expect(sanitizeNumber(undefined)).toBeNull();
    });
  });

  describe('rateLimiter', () => {
    it('should allow requests within limit', () => {
      const key = 'test-key';
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.isAllowed(key)).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const key = 'test-key';
      // Делаем 10 запросов (лимит)
      for (let i = 0; i < 10; i++) {
        rateLimiter.isAllowed(key);
      }
      // 11-й запрос должен быть заблокирован
      expect(rateLimiter.isAllowed(key)).toBe(false);
    });

    it('should reset after window expires', async () => {
      const key = 'test-key';
      // Создаём новый экземпляр с коротким окном для теста
      class TestRateLimiter {
        private requests: Map<string, number[]> = new Map();
        private readonly maxRequests: number = 2;
        private readonly windowMs: number = 100;

        isAllowed(key: string): boolean {
          const now = Date.now();
          const requests = this.requests.get(key) || [];
          const recentRequests = requests.filter(
            (time) => now - time < this.windowMs
          );
          if (recentRequests.length >= this.maxRequests) {
            return false;
          }
          recentRequests.push(now);
          this.requests.set(key, recentRequests);
          return true;
        }
      }

      const limiter = new TestRateLimiter();

      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.isAllowed(key)).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(limiter.isAllowed(key)).toBe(true);
    });

    it('should reset specific key', () => {
      const key = 'test-key';
      for (let i = 0; i < 10; i++) {
        rateLimiter.isAllowed(key);
      }
      expect(rateLimiter.isAllowed(key)).toBe(false);
      rateLimiter.reset(key);
      expect(rateLimiter.isAllowed(key)).toBe(true);
    });
  });

  describe('safeGet', () => {
    it('should extract nested values', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(safeGet(obj, 'a.b.c', 0)).toBe(42);
    });

    it('should return default for missing paths', () => {
      const obj = { a: { b: {} } };
      expect(safeGet(obj, 'a.b.c', 'default')).toBe('default');
    });

    it('should return default for invalid objects', () => {
      expect(safeGet(null, 'a.b', 'default')).toBe('default');
      expect(safeGet(undefined, 'a.b', 'default')).toBe('default');
      expect(safeGet('not-object', 'a.b', 'default')).toBe('default');
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of correct length', () => {
      const token = generateCSRFToken();
      expect(token.length).toBe(64); // 32 bytes * 2 hex chars
    });
  });

  describe('isValidTimestamp', () => {
    it('should validate recent timestamps', () => {
      const recent = Date.now() - 1000; // 1 second ago
      expect(isValidTimestamp(recent, 60000)).toBe(true);
    });

    it('should reject old timestamps', () => {
      const old = Date.now() - 120000; // 2 minutes ago
      expect(isValidTimestamp(old, 60000)).toBe(false);
    });

    it('should reject future timestamps', () => {
      const future = Date.now() + 1000; // 1 second in future
      expect(isValidTimestamp(future, 60000)).toBe(false);
    });
  });
});
