import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Мокаем console до импорта logger
const mockConsole = {
  debug: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.stubGlobal('console', {
  ...console,
  debug: mockConsole.debug,
  log: mockConsole.log,
  warn: mockConsole.warn,
  error: mockConsole.error,
});

// Импортируем после мока
import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('test message');
      expect(mockConsole.debug).toHaveBeenCalled();
    });

    it('should pass multiple arguments', () => {
      logger.debug('message', { data: 123 });
      expect(mockConsole.debug).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('info message');
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warnings', () => {
      logger.warn('warning message');
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log errors', () => {
      logger.error('error message');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error('Something went wrong:', error);
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('dev', () => {
    it('should log dev messages in development', () => {
      logger.dev('dev only message');
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});
