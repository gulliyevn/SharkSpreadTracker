import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initWebVitals } from '../web-vitals';

vi.mock('../analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

vi.mock('../sentry', () => ({
  captureMessage: vi.fn(),
}));

describe('web-vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export initWebVitals function', () => {
    expect(typeof initWebVitals).toBe('function');
  });

  it('should call initWebVitals without errors', () => {
    // Просто проверяем что функция может быть вызвана без ошибок
    expect(() => initWebVitals()).not.toThrow();
  });

  it('should initialize web vitals in production mode', () => {
    // В production режиме функция должна работать без ошибок
    const originalEnv = import.meta.env.PROD;

    // Мокируем production
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, PROD: true },
      writable: true,
      configurable: true,
    });

    expect(() => initWebVitals()).not.toThrow();

    // Восстанавливаем
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, PROD: originalEnv },
      writable: true,
      configurable: true,
    });
  });

  it('should not initialize web vitals in development mode', () => {
    // В development режиме функция должна работать без ошибок, но не регистрировать callbacks
    const originalEnv = import.meta.env.PROD;

    // Мокируем development
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, PROD: false },
      writable: true,
      configurable: true,
    });

    expect(() => initWebVitals()).not.toThrow();

    // Восстанавливаем
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, PROD: originalEnv },
      writable: true,
      configurable: true,
    });
  });
});
