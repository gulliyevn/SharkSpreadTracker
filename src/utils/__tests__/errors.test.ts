import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  ValidationError,
  getApiErrorTranslationKey,
  getErrorMessage,
  isNetworkError,
  isTimeoutError,
  isAxiosError,
  getErrorStatusCode,
  getErrorCode,
  ok,
  err,
  type Result,
} from '../errors';

describe('errors', () => {
  describe('ApiError', () => {
    it('should create ApiError with message and statusCode', () => {
      const error = new ApiError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should create ApiError with details', () => {
      const details = { field: 'id' };
      const error = new ApiError('Validation failed', 400, details);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should create ValidationError with field', () => {
      const error = new ValidationError('Invalid input', 'email');
      expect(error.field).toBe('email');
    });
  });

  describe('getApiErrorTranslationKey', () => {
    it('should return correct key for 401', () => {
      const error = new ApiError('Unauthorized', 401);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.invalidKey');
    });

    it('should return correct key for 403', () => {
      const error = new ApiError('Forbidden', 403);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.forbidden');
    });

    it('should return correct key for 404', () => {
      const error = new ApiError('Not found', 404);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.notFound');
    });

    it('should return correct key for 429', () => {
      const error = new ApiError('Too many requests', 429);
      expect(getApiErrorTranslationKey(error)).toBe(
        'api.errors.tooManyRequests'
      );
    });

    it('should return correct key for 500', () => {
      const error = new ApiError('Server error', 500);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.serverError');
    });

    it('should return correct key for 502', () => {
      const error = new ApiError('Bad gateway', 502);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.serverError');
    });

    it('should return correct key for 503', () => {
      const error = new ApiError('Service unavailable', 503);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.serverError');
    });

    it('should return unknown for other status codes', () => {
      const error = new ApiError('Unknown error', 418);
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.unknown');
    });

    it('should return message for ValidationError', () => {
      const error = new ValidationError('Invalid field');
      expect(getApiErrorTranslationKey(error)).toBe('Invalid field');
    });

    it('should return networkError for network errors', () => {
      const error = new Error('Network request failed');
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.networkError');
    });

    it('should return timeout for timeout errors', () => {
      const error = new Error('Request timeout');
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.timeout');
    });

    it('should return unknown key for other Error instances', () => {
      const error = new Error('Custom error');
      // После исправления функция возвращает ключ перевода, а не raw message
      expect(getApiErrorTranslationKey(error)).toBe('api.errors.unknown');
    });

    it('should return unknown for non-Error values', () => {
      expect(getApiErrorTranslationKey(null)).toBe('api.errors.unknown');
      expect(getApiErrorTranslationKey(undefined)).toBe('api.errors.unknown');
      expect(getApiErrorTranslationKey('string')).toBe('api.errors.unknown');
    });
  });

  describe('getErrorMessage', () => {
    const mockT = vi.fn((key: string) => `translated:${key}`);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should use translation function when provided', () => {
      const error = new ApiError('Not found', 404);
      const result = getErrorMessage(error, mockT);
      expect(mockT).toHaveBeenCalledWith('api.errors.notFound');
      expect(result).toBe('translated:api.errors.notFound');
    });

    it('should return English fallback for 401 without translation', () => {
      const error = new ApiError('Unauthorized', 401);
      const result = getErrorMessage(error);
      expect(result).toBe('Invalid API key. Please check the key.');
    });

    it('should return English fallback for 403 without translation', () => {
      const error = new ApiError('Forbidden', 403);
      const result = getErrorMessage(error);
      expect(result).toBe('Access denied. Check your permissions.');
    });

    it('should return English fallback for 404 without translation', () => {
      const error = new ApiError('Not found', 404);
      const result = getErrorMessage(error);
      expect(result).toBe('Data not found.');
    });

    it('should return English fallback for 429 without translation', () => {
      const error = new ApiError('Too many requests', 429);
      const result = getErrorMessage(error);
      expect(result).toBe('Too many requests. Please wait a bit.');
    });

    it('should return English fallback for 500 without translation', () => {
      const error = new ApiError('Server error', 500);
      const result = getErrorMessage(error);
      expect(result).toBe('Server error. Please try again later.');
    });

    it('should return error message for unknown status code', () => {
      const error = new ApiError('Custom error', 418);
      const result = getErrorMessage(error);
      expect(result).toBe('Custom error');
    });

    it('should return default message for ApiError without message', () => {
      const error = new ApiError('', 418);
      const result = getErrorMessage(error);
      expect(result).toBe('An error occurred while requesting the server.');
    });

    it('should return message for ValidationError', () => {
      const error = new ValidationError('Invalid input');
      const result = getErrorMessage(error);
      expect(result).toBe('Invalid input');
    });

    it('should return network error message for network errors', () => {
      const error = new Error('Network request failed');
      const result = getErrorMessage(error);
      expect(result).toBe('Network connection problem. Check your connection.');
    });

    it('should return timeout error message for timeout errors', () => {
      const error = new Error('Request timeout');
      const result = getErrorMessage(error);
      expect(result).toBe('Request timeout exceeded. Please try again.');
    });

    it('should return error message for other Error instances', () => {
      const error = new Error('Custom error');
      const result = getErrorMessage(error);
      expect(result).toBe('Custom error');
    });

    it('should return unknown error message for non-Error values', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred.');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred.');
      expect(getErrorMessage('string')).toBe('An unknown error occurred.');
    });
  });

  describe('isNetworkError', () => {
    it('should return true for network errors', () => {
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('Other error'))).toBe(false);
      expect(isNetworkError(new ApiError('Not found', 404))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for timeout errors', () => {
      expect(isTimeoutError(new Error('Request timeout'))).toBe(true);
      expect(isTimeoutError(new Error('Timeout exceeded'))).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      expect(isTimeoutError(new Error('Other error'))).toBe(false);
      expect(isTimeoutError(new ApiError('Not found', 404))).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
    });
  });

  describe('isAxiosError', () => {
    it('should return true for Axios-like errors with response', () => {
      const error = {
        response: { status: 404 },
      };
      expect(isAxiosError(error)).toBe(true);
    });

    it('should return true for Axios-like errors with code', () => {
      const error = {
        code: 'ECONNREFUSED',
      };
      expect(isAxiosError(error)).toBe(true);
    });

    it('should return true for Axios-like errors with code', () => {
      const error = {
        code: 'ECONNREFUSED',
      };
      expect(isAxiosError(error)).toBe(true);
    });

    it('should return true for Axios-like errors with both response and code', () => {
      const error = {
        response: { status: 404 },
        code: 'ECONNREFUSED',
      };
      expect(isAxiosError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isAxiosError(new Error('Error'))).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAxiosError(null)).toBe(false);
      expect(isAxiosError(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isAxiosError('string')).toBe(false);
      expect(isAxiosError(123)).toBe(false);
    });
  });

  describe('getErrorStatusCode', () => {
    it('should return status code for Axios-like error', () => {
      const error = {
        response: { status: 404 },
      };
      expect(getErrorStatusCode(error)).toBe(404);
    });

    it('should return null for Axios-like error without status', () => {
      const error = {
        response: {},
      };
      expect(getErrorStatusCode(error)).toBe(null);
    });

    it('should return null for non-Axios error', () => {
      expect(getErrorStatusCode(new Error('Error'))).toBe(null);
      expect(getErrorStatusCode(null)).toBe(null);
    });
  });

  describe('getErrorCode', () => {
    it('should return code for Axios-like error', () => {
      const error = {
        code: 'ECONNREFUSED',
      };
      expect(getErrorCode(error)).toBe('ECONNREFUSED');
    });

    it('should return null for Axios-like error without code', () => {
      const error = {
        response: { status: 404 },
      };
      expect(getErrorCode(error)).toBe(null);
    });

    it('should return null for non-Axios error', () => {
      expect(getErrorCode(new Error('Error'))).toBe(null);
      expect(getErrorCode(null)).toBe(null);
    });
  });

  describe('Result type helpers', () => {
    describe('ok', () => {
      it('should create success result', () => {
        const result = ok('data');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('data');
        }
      });
    });

    describe('err', () => {
      it('should create error result', () => {
        const error = new Error('Error');
        const result = err(error);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(error);
        }
      });
    });

    it('should work with Result type', () => {
      const successResult: Result<string, Error> = ok('data');
      expect(successResult.success).toBe(true);

      const errorResult: Result<string, Error> = err(new Error('Error'));
      expect(errorResult.success).toBe(false);
    });
  });
});
