import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleApiError,
  withErrorHandling,
  createQueryErrorHandler,
} from '../api-error-handler';
import { ApiError, ValidationError } from '../errors';
import { logger } from '../logger';

describe('api-error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should handle ApiError with logging', () => {
      const error = new ApiError('Test error', 404, { detail: 'Not found' });
      const loggerSpy = vi.spyOn(logger, 'error');

      const result = handleApiError(error, { logDetails: true });

      expect(loggerSpy).toHaveBeenCalledWith(
        'API Error:',
        expect.objectContaining({
          statusCode: 404,
          message: 'Test error',
          details: { detail: 'Not found' },
        })
      );
      expect(result).toBeTruthy();
    });

    it('should handle ApiError with context', () => {
      const error = new ApiError('Test error', 500);
      const loggerSpy = vi.spyOn(logger, 'error');

      handleApiError(error, { context: 'TestContext', logDetails: true });

      expect(loggerSpy).toHaveBeenCalledWith(
        '[TestContext] API Error:',
        expect.any(Object)
      );
    });

    it('should handle ValidationError with logging', () => {
      const error = new ValidationError('Invalid value', 'field');
      const loggerSpy = vi.spyOn(logger, 'error');

      const result = handleApiError(error, { logDetails: true });

      expect(loggerSpy).toHaveBeenCalled();
      const calls = loggerSpy.mock.calls;
      expect(calls[0]).toBeDefined();
      expect(calls[0]![0]).toContain('Validation Error:');
      expect(calls[0]![1]).toMatchObject({
        field: 'field',
        message: 'Invalid value',
      });
      expect(result).toBeTruthy();
    });

    it('should handle ValidationError with context', () => {
      const error = new ValidationError('Invalid value', 'field');
      const loggerSpy = vi.spyOn(logger, 'error');

      handleApiError(error, {
        context: 'ValidationContext',
        logDetails: true,
      });

      expect(loggerSpy).toHaveBeenCalled();
      const calls = loggerSpy.mock.calls;
      expect(calls[0]).toBeDefined();
      expect(calls[0]![0]).toContain('[ValidationContext] Validation Error:');
    });

    it('should handle generic Error with logging', () => {
      const error = new Error('Generic error');
      error.stack = 'stack trace';
      const loggerSpy = vi.spyOn(logger, 'error');

      const result = handleApiError(error, { logDetails: true });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error:',
        'Generic error',
        'stack trace'
      );
      expect(result).toBeTruthy();
    });

    it('should handle generic Error with context', () => {
      const error = new Error('Generic error');
      const loggerSpy = vi.spyOn(logger, 'error');

      handleApiError(error, { context: 'ErrorContext', logDetails: true });

      expect(loggerSpy).toHaveBeenCalled();
      const calls = loggerSpy.mock.calls;
      expect(calls[0]).toBeDefined();
      expect(calls[0]![0]).toContain('[ErrorContext] Error:');
      expect(calls[0]![1]).toBe('Generic error');
    });

    it('should handle unknown error type with logging', () => {
      const error = { custom: 'error object' };
      const loggerSpy = vi.spyOn(logger, 'error');

      const result = handleApiError(error, { logDetails: true });

      expect(loggerSpy).toHaveBeenCalledWith('Unknown error:', error);
      expect(result).toBeTruthy();
    });

    it('should handle unknown error with context', () => {
      const error = { custom: 'error object' };
      const loggerSpy = vi.spyOn(logger, 'error');

      handleApiError(error, { context: 'UnknownContext', logDetails: true });

      expect(loggerSpy).toHaveBeenCalledWith(
        '[UnknownContext] Unknown error:',
        error
      );
    });

    it('should not log when logDetails is false', () => {
      const error = new ApiError('Test error', 500);
      const loggerSpy = vi.spyOn(logger, 'error');

      const result = handleApiError(error, { logDetails: false });

      expect(loggerSpy).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should use translation function when provided', () => {
      const error = new ApiError('Test error', 500);
      const t = vi.fn((key: string) => `translated: ${key}`);

      const result = handleApiError(error, { t, logDetails: false });

      expect(result).toBeTruthy();
      // getErrorMessage может использовать t функцию
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap function and handle errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const loggerSpy = vi.spyOn(logger, 'error');

      const wrapped = withErrorHandling(fn, 'TestContext');

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should pass through successful results', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const wrapped = withErrorHandling(fn);

      const result = await wrapped();
      expect(result).toBe('success');
    });

    it('should pass arguments correctly', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const wrapped = withErrorHandling(fn);

      await wrapped('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should rethrow error after handling', async () => {
      const error = new ApiError('Test error', 500);
      const fn = vi.fn().mockRejectedValue(error);

      const wrapped = withErrorHandling(fn);

      await expect(wrapped()).rejects.toThrow(error);
    });
  });

  describe('createQueryErrorHandler', () => {
    it('should create error handler that calls handleApiError', () => {
      const error = new ApiError('Test error', 500);
      const loggerSpy = vi.spyOn(logger, 'error');

      const handler = createQueryErrorHandler('QueryContext');
      handler(error);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[QueryContext] API Error:',
        expect.any(Object)
      );
    });

    it('should create error handler without context', () => {
      const error = new Error('Test error');
      const loggerSpy = vi.spyOn(logger, 'error');

      const handler = createQueryErrorHandler();
      handler(error);

      // logger.error вызывается с spread аргументами, проверяем что был вызван
      expect(loggerSpy).toHaveBeenCalled();
      const calls = loggerSpy.mock.calls;
      expect(calls[0]).toBeDefined();
      expect(calls[0]![0]).toContain('Error:');
      expect(calls[0]![1]).toBe('Test error');
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid', 'field');
      const loggerSpy = vi.spyOn(logger, 'error');

      const handler = createQueryErrorHandler('Validation');
      handler(error);

      expect(loggerSpy).toHaveBeenCalled();
      const calls = loggerSpy.mock.calls;
      expect(calls[0]).toBeDefined();
      expect(calls[0]![0]).toContain('[Validation] Validation Error:');
    });
  });
});
