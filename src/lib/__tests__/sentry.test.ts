import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import {
  initSentry,
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
} from '../sentry';

// Мокаем Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
  setContext: vi.fn(),
}));

describe('sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initSentry', () => {
    it('should not initialize Sentry if DSN is not provided', () => {
      // Мокаем env переменные через vi.stubEnv
      vi.stubEnv('VITE_SENTRY_DSN', '');

      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    it('should initialize Sentry if DSN is provided', () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'production');

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'production',
          enabled: true,
        })
      );

      vi.unstubAllEnvs();
    });

    it('should disable Sentry in development mode', () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'development');

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );

      vi.unstubAllEnvs();
    });

    it('should enable Sentry in production mode', () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'production');

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );

      vi.unstubAllEnvs();
    });

    it('should configure performance monitoring', () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'production');

      initSentry();

      expect(Sentry.browserTracingIntegration).toHaveBeenCalled();
      expect(Sentry.replayIntegration).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });
  });

  describe('captureError', () => {
    it('should capture error with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      captureError(error, context);

      expect(Sentry.setContext).toHaveBeenCalledWith('custom', context);
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture error without context', () => {
      const error = new Error('Test error');

      captureError(error);

      expect(Sentry.setContext).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should handle errors gracefully if Sentry is not initialized', () => {
      const error = new Error('Test error');
      vi.mocked(Sentry.captureException).mockImplementation(() => {
        throw new Error('Sentry not initialized');
      });

      // Не должно выбросить ошибку
      expect(() => captureError(error)).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('should capture message with default level', () => {
      captureMessage('Test message');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Test message',
        'info'
      );
    });

    it('should capture message with custom level', () => {
      captureMessage('Warning message', 'warning');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Warning message',
        'warning'
      );
    });

    it('should handle errors gracefully if Sentry is not initialized', () => {
      vi.mocked(Sentry.captureMessage).mockImplementation(() => {
        throw new Error('Sentry not initialized');
      });

      expect(() => captureMessage('Test')).not.toThrow();
    });
  });

  describe('setUserContext', () => {
    it('should set user context', () => {
      const user = { id: '123', email: 'test@example.com', username: 'test' };

      setUserContext(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should handle errors gracefully if Sentry is not initialized', () => {
      vi.mocked(Sentry.setUser).mockImplementation(() => {
        throw new Error('Sentry not initialized');
      });

      expect(() => setUserContext({ id: '123' })).not.toThrow();
    });
  });

  describe('clearUserContext', () => {
    it('should clear user context', () => {
      clearUserContext();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should handle errors gracefully if Sentry is not initialized', () => {
      vi.mocked(Sentry.setUser).mockImplementation(() => {
        throw new Error('Sentry not initialized');
      });

      expect(() => clearUserContext()).not.toThrow();
    });
  });
});
