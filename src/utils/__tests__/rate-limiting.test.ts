import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractRateLimitInfo,
  isRateLimitError,
  calculateBackoffDelay,
  withRateLimitRetry,
} from '../rate-limiting';
import { ApiError } from '../errors';

// Мокаем logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('rate-limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('extractRateLimitInfo', () => {
    it('should handle response without headers gracefully', () => {
      const response = { headers: new Headers() } as Response;
      const info = extractRateLimitInfo(response);
      expect(info).toEqual({
        retryAfter: 1000, // default value
      });
    });

    it('should extract retry-after in seconds', () => {
      const headers = new Headers();
      headers.set('Retry-After', '5');
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info).toEqual({
        retryAfter: 5000,
      });
    });

    it('should extract retry-after as timestamp (seconds)', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 10;
      const headers = new Headers();
      headers.set('Retry-After', String(futureTimestamp));
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info).not.toBeNull();
      expect(info?.retryAfter).toBeGreaterThan(0);
    });

    it('should extract retry-after as timestamp (milliseconds)', () => {
      const futureTimestamp = Date.now() + 10000;
      const headers = new Headers();
      headers.set('Retry-After', String(futureTimestamp));
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info).not.toBeNull();
      expect(info?.retryAfter).toBeGreaterThan(0);
    });

    it('should handle invalid retry-after and use default', () => {
      const headers = new Headers();
      headers.set('Retry-After', 'invalid');
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info?.retryAfter).toBe(1000);
    });

    it('should extract all rate limit headers', () => {
      const headers = new Headers();
      headers.set('Retry-After', '3');
      headers.set('X-RateLimit-Limit', '100');
      headers.set('X-RateLimit-Remaining', '50');
      headers.set('X-RateLimit-Reset', '1234567890');
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info).toEqual({
        retryAfter: 3000,
        limit: 100,
        remaining: 50,
        resetAt: 1234567890000, // milliseconds
      });
    });

    it('should extract reset timestamp in milliseconds', () => {
      const resetTimestamp = Date.now() + 60000;
      const headers = new Headers();
      headers.set('X-RateLimit-Reset', String(resetTimestamp));
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info?.resetAt).toBe(resetTimestamp);
    });

    it('should handle invalid limit header', () => {
      const headers = new Headers();
      headers.set('X-RateLimit-Limit', 'invalid');
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info?.limit).toBeUndefined();
    });

    it('should handle invalid remaining header', () => {
      const headers = new Headers();
      headers.set('X-RateLimit-Remaining', 'invalid');
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info?.remaining).toBeUndefined();
    });

    it('should handle invalid reset header', () => {
      const headers = new Headers();
      headers.set('X-RateLimit-Reset', 'invalid');
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info?.resetAt).toBeUndefined();
    });

    it('should handle past timestamp for retry-after', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 10;
      const headers = new Headers();
      headers.set('Retry-After', String(pastTimestamp));
      const response = { headers } as Response;

      const info = extractRateLimitInfo(response);
      expect(info?.retryAfter).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for 429 ApiError', () => {
      const error = new ApiError('Too many requests', 429);
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return false for non-429 ApiError', () => {
      const error = new ApiError('Not found', 404);
      expect(isRateLimitError(error)).toBe(false);
    });

    it('should return false for non-ApiError', () => {
      const error = new Error('Generic error');
      expect(isRateLimitError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRateLimitError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should use retryAfter if provided and positive', () => {
      const delay = calculateBackoffDelay(0, 1000, 30000, 5000);
      expect(delay).toBe(5000);
    });

    it('should use exponential backoff when retryAfter is undefined', () => {
      const delay1 = calculateBackoffDelay(0, 1000, 30000);
      expect(delay1).toBe(1000);

      const delay2 = calculateBackoffDelay(1, 1000, 30000);
      expect(delay2).toBe(2000);

      const delay3 = calculateBackoffDelay(2, 1000, 30000);
      expect(delay3).toBe(4000);

      const delay4 = calculateBackoffDelay(3, 1000, 30000);
      expect(delay4).toBe(8000);
    });

    it('should cap delay at maxDelay', () => {
      const delay = calculateBackoffDelay(10, 1000, 30000);
      expect(delay).toBe(30000);
    });

    it('should cap retryAfter at maxDelay', () => {
      const delay = calculateBackoffDelay(0, 1000, 30000, 50000);
      expect(delay).toBe(30000);
    });

    it('should use exponential backoff when retryAfter is 0', () => {
      const delay = calculateBackoffDelay(2, 1000, 30000, 0);
      expect(delay).toBe(4000);
    });

    it('should use exponential backoff when retryAfter is negative', () => {
      const delay = calculateBackoffDelay(2, 1000, 30000, -1);
      expect(delay).toBe(4000);
    });

    it('should handle custom baseDelay', () => {
      const delay = calculateBackoffDelay(2, 500, 30000);
      expect(delay).toBe(2000); // 500 * 2^2
    });
  });

  describe('withRateLimitRetry', () => {
    it('should return result on first attempt if successful', async () => {
      const requestFn = vi.fn().mockResolvedValue('success');
      const result = await withRateLimitRetry(requestFn, 3, 1000);
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should throw non-rate-limit error immediately', async () => {
      const error = new Error('Network error');
      const requestFn = vi.fn().mockRejectedValue(error);

      await expect(withRateLimitRetry(requestFn, 3, 1000)).rejects.toThrow(
        'Network error'
      );
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit error and succeed', async () => {
      const rateLimitError = new ApiError('Too many requests', 429);
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 1000);

      // Запускаем таймеры асинхронно
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should retry with exponential backoff', async () => {
      const rateLimitError = new ApiError('Too many requests', 429);
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const rateLimitError = new ApiError('Too many requests', 429);
      const requestFn = vi.fn().mockRejectedValue(rateLimitError);

      const promise = withRateLimitRetry(requestFn, 2, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(429);
      }
      expect(requestFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should extract retryAfter from error details', async () => {
      const headers = new Headers();
      headers.set('Retry-After', '2');
      const response = { headers } as Response;
      const rateLimitError = new ApiError('Too many requests', 429, {
        response,
      });
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should handle error without details', async () => {
      const rateLimitError = new ApiError('Too many requests', 429);
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should handle error with details but without response', async () => {
      const rateLimitError = new ApiError('Too many requests', 429, {});
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should handle error with invalid response in details', async () => {
      const rateLimitError = new ApiError('Too many requests', 429, {
        response: null,
      });
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should use custom maxRetries', async () => {
      const rateLimitError = new ApiError('Too many requests', 429);
      const requestFn = vi.fn().mockRejectedValue(rateLimitError);

      const promise = withRateLimitRetry(requestFn, 1, 1000);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(429);
      }
      expect(requestFn).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('should use custom baseDelay', async () => {
      const rateLimitError = new ApiError('Too many requests', 429);
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = withRateLimitRetry(requestFn, 3, 500);

      // Запускаем все таймеры
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });
});
