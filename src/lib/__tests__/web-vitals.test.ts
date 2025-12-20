import { describe, it, expect } from 'vitest';
import { initWebVitals } from '../web-vitals';

describe('web-vitals', () => {
  it('should export initWebVitals function', () => {
    expect(typeof initWebVitals).toBe('function');
  });

  it('should call initWebVitals without errors', () => {
    // Просто проверяем что функция может быть вызвана без ошибок
    expect(() => initWebVitals()).not.toThrow();
  });
});
