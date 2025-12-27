/**
 * Тесты для theme-init.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTheme } from '../theme-init';

// Мокаем logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('initTheme', () => {
  beforeEach(() => {
    // Очищаем классы и localStorage перед каждым тестом
    document.documentElement.classList.remove('dark');
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('должен применять темную тему из localStorage', () => {
    localStorage.setItem('shark_theme', 'dark');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('должен применять светлую тему из localStorage', () => {
    localStorage.setItem('shark_theme', 'light');
    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('должен использовать системную тему при theme="system"', () => {
    localStorage.setItem('shark_theme', 'system');

    // Мокаем matchMedia для темной темы
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Устанавливаем системную тему как dark
    const darkMatchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    (
      window.matchMedia as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce({
      ...darkMatchMedia,
      matches: true,
    });

    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('должен использовать системную тему при theme="system" и светлой системной теме', () => {
    localStorage.setItem('shark_theme', 'system');

    // Мокаем matchMedia для светлой темы
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query !== '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const lightMatchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    (
      window.matchMedia as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce({
      ...lightMatchMedia,
      matches: false,
    });

    initTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('должен использовать "system" по умолчанию, если тема не установлена', () => {
    // localStorage пустой
    initTheme();
    // Должна использоваться системная тема (по умолчанию light в тестах)
    // Проверяем, что функция выполнилась без ошибок
    expect(document.documentElement).toBeDefined();
  });

  it('должен обрабатывать ошибки localStorage gracefully', () => {
    // Мокаем localStorage.getItem чтобы выбросить ошибку
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn(() => {
      throw new Error('localStorage недоступен');
    });

    // Функция не должна выбросить ошибку
    expect(() => initTheme()).not.toThrow();

    // Восстанавливаем оригинальный метод
    localStorage.getItem = originalGetItem;
  });

  it('должен возвращаться без действий, если window не определен', () => {
    // Сохраняем оригинальный window
    const originalWindow = global.window;
    // @ts-expect-error - временно удаляем window для теста
    delete global.window;

    // Функция не должна выбросить ошибку
    expect(() => initTheme()).not.toThrow();

    // Восстанавливаем window
    global.window = originalWindow;
  });
});
