import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('should handle functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('should handle objects', () => {
    const initialValue = { name: 'test', value: 123 };
    const { result } = renderHook(() =>
      useLocalStorage('test-key', initialValue)
    );

    act(() => {
      result.current[1]({ name: 'updated', value: 456 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', value: 456 });
  });

  it('should handle QuotaExceededError gracefully', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    // Should not crash, value should still update in state
    expect(result.current[0]).toBe('new-value');

    setItemSpy.mockRestore();
  });

  it('should handle other errors gracefully', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('Other error');
      });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');

    setItemSpy.mockRestore();
  });

  it('should handle data too large for localStorage', () => {
    const largeData = 'x'.repeat(6 * 1024 * 1024); // 6MB
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1](largeData);
    });

    // Should not crash
    expect(result.current[0]).toBe(largeData);
  });

  it('should sync with storage events from other tabs', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('synced-value'),
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('synced-value');
  });

  it('should ignore storage events for other keys', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('other-value'),
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('initial');
  });

  it('should handle invalid JSON in storage event', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: 'invalid-json',
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    // Should not crash, value should remain unchanged
    expect(result.current[0]).toBe('initial');
  });

  it('should handle null newValue in storage event', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: null,
        oldValue: JSON.stringify('updated'),
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    // Should not change when newValue is null
    expect(result.current[0]).toBe('updated');
  });
});
