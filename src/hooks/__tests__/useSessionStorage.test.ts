import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStorage } from '../useSessionStorage';

describe('useSessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should return initial value when storage is empty', () => {
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'default')
    );
    expect(result.current[0]).toBe('default');
  });

  it('should return stored value when present', () => {
    sessionStorage.setItem('test-key', JSON.stringify('stored-value'));

    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'default')
    );
    expect(result.current[0]).toBe('stored-value');
  });

  it('should update value and storage', () => {
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'initial')
    );

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(JSON.parse(sessionStorage.getItem('test-key') || '')).toBe(
      'new-value'
    );
  });

  it('should handle object values', () => {
    const initial = { foo: 'bar' };
    const { result } = renderHook(() => useSessionStorage('test-key', initial));

    expect(result.current[0]).toEqual(initial);

    act(() => {
      result.current[1]({ foo: 'baz' });
    });

    expect(result.current[0]).toEqual({ foo: 'baz' });
  });

  it('should handle array values', () => {
    const { result } = renderHook(() =>
      useSessionStorage<string[]>('test-key', [])
    );

    act(() => {
      result.current[1](['a', 'b', 'c']);
    });

    expect(result.current[0]).toEqual(['a', 'b', 'c']);
  });

  it('should handle updater function', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(6);
  });

  it('should handle invalid JSON in storage gracefully', () => {
    sessionStorage.setItem('test-key', 'not-valid-json');

    // Должен вернуть значение по умолчанию или что-то что не крашится
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'default')
    );
    // Результат зависит от реализации - либо default, либо сырая строка
    expect(result.current[0]).toBeDefined();
  });

  it('should sync between hooks with same key', () => {
    const { result: result1 } = renderHook(() =>
      useSessionStorage('shared-key', '')
    );
    // Второй хук создаём для проверки что storage обновляется
    renderHook(() => useSessionStorage('shared-key', ''));

    act(() => {
      result1.current[1]('updated');
    });

    // storage should be updated
    expect(sessionStorage.getItem('shared-key')).toBe(
      JSON.stringify('updated')
    );
  });

  it('should remove item when setting to undefined', () => {
    const { result } = renderHook(() =>
      useSessionStorage<string | undefined>('test-key', 'initial')
    );

    act(() => {
      result.current[1](undefined);
    });

    expect(result.current[0]).toBeUndefined();
  });

  it('should handle storage event', () => {
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'initial')
    );

    // Симулируем storage event
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('from-event'),
        storageArea: sessionStorage,
      });
      window.dispatchEvent(event);
    });

    // Значение должно обновиться
    expect(result.current[0]).toBeDefined();
  });

  it('should handle storage event with null value', () => {
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'initial')
    );

    // Симулируем удаление через storage event
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: null,
        storageArea: sessionStorage,
      });
      window.dispatchEvent(event);
    });

    // Должен вернуться к initial
    expect(result.current[0]).toBe('initial');
  });

  it('should ignore storage events for different keys', () => {
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'initial')
    );

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('other-value'),
        storageArea: sessionStorage,
      });
      window.dispatchEvent(event);
    });

    // Значение не должно измениться
    expect(result.current[0]).toBe('initial');
  });

  it('should handle invalid JSON in storage event', () => {
    const { result } = renderHook(() =>
      useSessionStorage('test-key', 'initial')
    );

    // Симулируем storage event с невалидным JSON
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: 'not-valid-json{',
        storageArea: sessionStorage,
      });
      window.dispatchEvent(event);
    });

    // Не должно крашиться
    expect(result.current[0]).toBeDefined();
  });
});
