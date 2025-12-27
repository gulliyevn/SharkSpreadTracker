/**
 * Logger utility для условного логирования в зависимости от окружения
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private enabled: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    // Включаем логирование в dev или если явно указано
    this.enabled =
      this.isDevelopment || import.meta.env.VITE_ENABLE_LOGGING === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) {
      return false;
    }

    // В production логируем только warn и error
    if (this.isProduction) {
      return level === 'warn' || level === 'error';
    }

    // В development логируем все
    return true;
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Логирование только в development
   */
  dev(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log('[DEV]', ...args);
    }
  }
}

export const logger = new Logger();
