import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have logger methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.dev).toBe('function');
  });

  it('should log warn messages (always enabled)', () => {
    logger.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Warning message');
  });

  it('should log error messages (always enabled)', () => {
    logger.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Error message');
  });

  it('should handle multiple log calls', () => {
    // Проверяем что методы выполняются без ошибок
    expect(() => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      logger.dev('Dev');
    }).not.toThrow();
  });
});
